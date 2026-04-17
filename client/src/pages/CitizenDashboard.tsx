import { useState, useRef, useCallback, useMemo, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Hexagon,
  Upload,
  FileText,
  FileImage,
  File,
  X,
  CheckCircle2,
  Clock,
  Shield,
  Plus,
  Eye,
  Fingerprint,
  AlertCircle,
  FolderOpen,
  Loader2,
  Hash,
  Award,
  LogOut,
  QrCode,
  ScanLine,
  Send,
  Signature,
} from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { StatusBadge } from '@/components/StatusBadge'
import { Progress } from '@/components/ui/progress'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { toast } from '@/hooks/use-toast'
import { useOnchainUser } from '@/hooks/useOnchainUser'
import { useOnchainClaimDefinitions } from '@/hooks/useOnchainClaimDefinitions'
import { useOnchainClaimRequests } from '@/hooks/useOnchainClaimRequests'
import { useOnchainCredentials } from '@/hooks/useOnchainCredentials'
import { claimRequestStatusLabel, claimStatusLabel, credentialStatusLabel, parseSsiClaim, parseSsiVerificationRequest } from '@/lib/ssiParsers'
import { uploadJsonToIPFS, uploadToIPFS } from '@/lib/ipfs'
import { isSsiContractConfigured, ssiChain, ssiContractAddress, thirdwebClient } from '@/lib/thirdweb'
import { useQueries } from '@tanstack/react-query'
import { getContract, prepareContractCall, readContract } from 'thirdweb'
import { useActiveAccount, useActiveWallet, useDisconnect, useReadContract, useSendAndConfirmTransaction, useContractEvents } from 'thirdweb/react'
import { parseVerificationQrPayload, type VerificationQrPayload } from '@/lib/verificationQr'
import { useSSIWrite } from '@/hooks/useSSIContract'
import { ClaimRow } from './Governance'
import jsQR from 'jsqr'

// ── Helpers ───────────────────────────────────────────────────────────────────
function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function FileIcon({ name, size = 'sm' }: { name: string; size?: 'sm' | 'md' }) {
  const ext = name.split('.').pop()?.toLowerCase() ?? ''
  const cls = size === 'md' ? 'h-5 w-5' : 'h-4 w-4'
  if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(ext)) return <FileImage className={`${cls} text-blue-400`} />
  if (ext === 'pdf') return <FileText className={`${cls} text-red-400`} />
  return <File className={`${cls} text-muted-foreground`} />
}

const cardAnim = (i: number) => ({
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.28, delay: i * 0.07 },
})

type BarcodeDetectorResult = { rawValue?: string }

type BarcodeDetectorInstance = {
  detect: (source: ImageBitmapSource) => Promise<BarcodeDetectorResult[]>
}

type BarcodeDetectorConstructor = new (options?: { formats?: string[] }) => BarcodeDetectorInstance

function formatUnixTime(timestamp: number) {
  if (!timestamp) return '—'
  return new Date(timestamp * 1000).toLocaleString()
}

function hexToBytes(hex: string): Uint8Array {
  const normalized = hex.startsWith('0x') ? hex.slice(2) : hex
  if (normalized.length % 2 !== 0) {
    throw new Error('Invalid hex string length')
  }

  const bytes = new Uint8Array(normalized.length / 2)
  for (let i = 0; i < normalized.length; i += 2) {
    bytes[i / 2] = Number.parseInt(normalized.slice(i, i + 2), 16)
  }
  return bytes
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function CitizenDashboard() {
  const navigate = useNavigate()
  const account = useActiveAccount()
  const activeWallet = useActiveWallet()
  const { disconnect } = useDisconnect()
  const { did, user, isConnected } = useOnchainUser()
  const isApproved = Boolean(user?.isApproved)

  const handleSignOut = () => {
    if (activeWallet) disconnect(activeWallet)
    navigate('/', { replace: true })
  }

  const { definitions, isLoading: defsLoading } = useOnchainClaimDefinitions()
  const { requests, addRequestId, refetchAll: refetchRequests } = useOnchainClaimRequests()
  const { credentials } = useOnchainCredentials(did)
  const { mutateAsync: sendAndConfirmTransactionAsync, isPending: isTxPending } = useSendAndConfirmTransaction()

  const contract = getContract({
    client: thirdwebClient,
    chain: ssiChain,
    address: ssiContractAddress,
  })

  const { data: rawClaimIds } = useReadContract({
    contract: contract,
    method: 'function getAllClaimIds() view returns (string[])',
    params: [],
  })

  const claimQueries = useQueries({
    queries:
      rawClaimIds && Array.isArray(rawClaimIds)
        ? (rawClaimIds as string[]).map((claimId) => ({
            queryKey: ['ssi-claim', claimId],
            queryFn: () =>
              readContract({
                contract: contract,
                method:
                  'function getClaim(string claimId) view returns ((string claimId, string claimType, string description, bool documentRequired, bool photoRequired, bool geolocationRequired, bool biometricRequired, uint256 numberOfApprovalsNeeded, uint8 status, uint256 createdAt, uint256 approvedAt, string createdByDid, string approvedByDid))',
                params: [claimId],
              }),
            enabled: isSsiContractConfigured,
            retry: 1,
            staleTime: 15_000,
          }))
        : [],
  })
  const allClaims = useMemo<ClaimRow[]>(() => {
    return claimQueries
      .map((q) => {
        if (!q.data) return null
        const c = parseSsiClaim(q.data)
        if (!c.claimId) return null
        return {
          id: c.claimId,
          name: c.claimType,
          description: c.description,
          documentRequired: c.documentRequired,
          photoRequired: c.photoRequired,
          geoRequired: c.geolocationRequired,
          biometricRequired: c.biometricRequired,
          approvalsNeeded: Number(c.numberOfApprovalsNeeded),
          createdByDid: c.createdByDid,
          approvedByDid: c.approvedByDid,
          status: c.status,
          statusLabel: claimStatusLabel(c.status),
        }
      })
      .filter((c): c is ClaimRow => Boolean(c))
  }, [claimQueries])

  const availableDefs = useMemo(() => allClaims, [allClaims])

  const myRequests = useMemo(() => requests.filter((r) => r.citizenDid === did), [requests, did])
  const activeCredentials = useMemo(() => credentials.filter((c) => c.status === 0), [credentials])
  const activeCredentialClaimIds = useMemo(() => new Set(activeCredentials.map((credential) => credential.claimId)), [activeCredentials])

  const [qrPayloadInput, setQrPayloadInput] = useState('')
  const [decodedQrPayload, setDecodedQrPayload] = useState<VerificationQrPayload | null>(null)
  const [qrScanError, setQrScanError] = useState<string | null>(null)
  const [isDecodingQrImage, setIsDecodingQrImage] = useState(false)
  const [isCameraOpen, setIsCameraOpen] = useState(false)
  const [isCameraStarting, setIsCameraStarting] = useState(false)
  const [cameraError, setCameraError] = useState<string | null>(null)
  const qrFileInputRef = useRef<HTMLInputElement>(null)
  const qrVideoRef = useRef<HTMLVideoElement>(null)
  const qrCanvasRef = useRef<HTMLCanvasElement>(null)
  const qrScanFrameRef = useRef<number | null>(null)
  const qrVideoStreamRef = useRef<MediaStream | null>(null)
  const isScanningFrameRef = useRef(false)

  // Presentation submission state
  const [selectedPresentationCredentials, setSelectedPresentationCredentials] = useState<Set<string>>(new Set())
  const [isSigningAndSubmitting, setIsSigningAndSubmitting] = useState(false)
  const [presentationStatus, setPresentationStatus] = useState<string | null>(null)
  const [presentationError, setPresentationError] = useState<string | null>(null)
  const { writeByName } = useSSIWrite()

  const requestedQrClaims = useMemo(() => {
    if (!decodedQrPayload) return []
    return decodedQrPayload.requestedClaims.map((claimId) => {
      const definition = availableDefs.find((item) => item.id === claimId)
      return {
        claimId,
        definition,
        inWallet: activeCredentialClaimIds.has(claimId),
      }
    })
  }, [decodedQrPayload, availableDefs, activeCredentialClaimIds])

  const { data: rawQrRequestData, isPending: isQrRequestPending } = useReadContract({
    contract,
    method:
      'function getVerificationRequest(string requestId) view returns ((string verificationRequestId, string verifierDid, string citizenDid, string[] requestedClaims, string nonce, uint8 status, uint256 createdAt, uint256 expiresAt, string presentationId, bool fulfilled))',
    params: [decodedQrPayload?.verificationRequestId ?? ''],
    queryOptions: { enabled: Boolean(decodedQrPayload?.verificationRequestId) },
  })

  const decodedQrRequest = useMemo(() => {
    if (!rawQrRequestData) return null
    return parseSsiVerificationRequest(rawQrRequestData)
  }, [rawQrRequestData])

  const qrRequestBlockingMessage = useMemo(() => {
    if (!decodedQrPayload) return null
    if (isQrRequestPending) return null
    if (!decodedQrRequest || !decodedQrRequest.verificationRequestId) {
      return 'This verification request was not found on-chain. This QR cannot be used.'
    }
    if (decodedQrRequest.fulfilled) {
      return 'This verification request is already fulfilled. This QR cannot be used again.'
    }
    if (decodedQrRequest.status === 1) {
      return 'This verification request is already approved. This QR cannot be used again.'
    }
    if (Number(decodedQrRequest.expiresAt) > 0 && Number(decodedQrRequest.expiresAt) < Math.floor(Date.now() / 1000)) {
      return 'This verification request has expired. Please ask the verifier to generate a new QR.'
    }
    return null
  }, [decodedQrPayload, decodedQrRequest, isQrRequestPending])

  // ── Presentation submission handler ──────────────────────────────────────
  const handleSignAndSubmitPresentation = useCallback(async () => {
    setPresentationError(null)
    setPresentationStatus(null)

    if (!decodedQrPayload || !did) {
      setPresentationError('QR payload or citizen DID is missing.')
      return
    }

    if (qrRequestBlockingMessage) {
      setPresentationError(qrRequestBlockingMessage)
      return
    }

    if (selectedPresentationCredentials.size === 0) {
      setPresentationError('Select at least one credential to present.')
      return
    }

    if (!activeWallet) {
      setPresentationError('Wallet not connected. Please connect your wallet to sign.')
      return
    }

    setIsSigningAndSubmitting(true)

    try {
      // Step 1: Generate unique presentationId
      const presentationId = `pres-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
      const credentialIds = Array.from(selectedPresentationCredentials)

      setPresentationStatus('Getting hash to sign...')

      // Step 2: Call getPresentationHash to get the hash
      const hashData = await readContract({
        contract: getContract({
          client: thirdwebClient,
          chain: ssiChain,
          address: ssiContractAddress,
        }),
        method: 'function getPresentationHash(string presentationId, string verificationRequestId, string[] credentialIds, string citizenDid, string verifierDid, string nonce) view returns (bytes32)',
        params: [presentationId, decodedQrPayload.verificationRequestId, credentialIds, did, decodedQrPayload.verifierDid, decodedQrPayload.nonce],
      })

      const hashHex = hashData as string // This will be a hex string from the contract

      setPresentationStatus('Signing presentation...')

      // Step 3: Sign the hash using the connected wallet
      // Format the hash as bytes for signing (EIP-191)
      const hashBytes = hexToBytes(hashHex)
      if (!account) {
        throw new Error('Wallet account is not available for signing.')
      }

      const signature = await account.signMessage({
        message: { raw: hashBytes },
      })

      setPresentationStatus('Submitting presentation to chain...')

      // Step 4: Submit presentation to contract
      await writeByName('submitPresentation', [
        {
          presentationId,
          verificationRequestId: decodedQrPayload.verificationRequestId,
          citizenDid: did,
          verifierDid: decodedQrPayload.verifierDid,
          credentialIds,
          citizenSignature: signature,
          nonce: decodedQrPayload.nonce,
          createdAt: BigInt(Math.floor(Date.now() / 1000)),
          expiresAt: BigInt(decodedQrPayload.expiresAt),
          verified: false,
        },
      ])

      setPresentationStatus('Presentation submitted successfully! Awaiting verifier approval.')
      toast({
        title: 'Presentation Submitted',
        description: `Your credentials have been submitted for verification. Presentation ID: ${presentationId}`,
      })

      // Clear selection after submission
      setSelectedPresentationCredentials(new Set())
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Failed to sign and submit presentation.'
      setPresentationError(errorMsg)
      toast({
        title: 'Submission Failed',
        description: errorMsg,
        variant: 'destructive',
      })
    } finally {
      setIsSigningAndSubmitting(false)
    }
  }, [decodedQrPayload, did, selectedPresentationCredentials, activeWallet, writeByName, account, qrRequestBlockingMessage])

  const togglePresentationCredential = (credentialId: string) => {
    setSelectedPresentationCredentials((current) => {
      const next = new Set(current)
      if (next.has(credentialId)) {
        next.delete(credentialId)
      } else {
        next.add(credentialId)
      }
      return next
    })
  }

  // ── Upload modal state ──────────────────────────────────────────────────
  const [uploadOpen, setUploadOpen] = useState(false)
  const [selectedClaimId, setSelectedClaimId] = useState('')
  const [documentFile, setDocumentFile] = useState<File | null>(null)
  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const [biometricFile, setBiometricFile] = useState<File | null>(null)
  const [geoTag, setGeoTag] = useState('')
  const [isLocating, setIsLocating] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [isUploading, setIsUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const photoInputRef = useRef<HTMLInputElement>(null)
  const biometricInputRef = useRef<HTMLInputElement>(null)

  const selectedDef = availableDefs.find((d) => d.id === selectedClaimId)

  // ── Drag-and-drop handlers ──────────────────────────────────────────────
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const dropped = e.dataTransfer.files[0]
    if (dropped) setDocumentFile(dropped)
  }

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.[0]) return
    setDocumentFile(e.target.files[0])
    e.target.value = ''
  }

  const handlePhotoInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.[0]) return
    setPhotoFile(e.target.files[0])
    e.target.value = ''
  }

  const handleBiometricInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.[0]) return
    setBiometricFile(e.target.files[0])
    e.target.value = ''
  }

  const captureCurrentLocation = async () => {
    if (!('geolocation' in navigator)) {
      toast({
        title: 'Location unavailable',
        description: 'This browser does not support geolocation.',
        variant: 'destructive',
      })
      return
    }

    setIsLocating(true)
    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 12_000,
          maximumAge: 0,
        })
      })

      const { latitude, longitude, accuracy } = position.coords
      const formatted = `${latitude.toFixed(6)}, ${longitude.toFixed(6)} (±${Math.round(accuracy)}m)`
      setGeoTag(formatted)
      toast({
        title: 'Location captured',
        description: 'Geo coordinates were filled automatically.',
      })
    } catch {
      toast({
        title: 'Location capture failed',
        description: 'Please allow location permission or enter coordinates manually.',
        variant: 'destructive',
      })
    } finally {
      setIsLocating(false)
    }
  }

  const tryParseQrPayload = useCallback((rawValue: string) => {
    const trimmed = rawValue.trim()
    const candidates = [trimmed]

    try {
      const decoded = decodeURIComponent(trimmed)
      if (decoded && decoded !== trimmed) {
        candidates.push(decoded)
      }
    } catch {
      // ignore malformed URI encoding
    }

    const payloadMatch = trimmed.match(/[?&]payload=([^&]+)/)
    if (payloadMatch?.[1]) {
      try {
        const extracted = decodeURIComponent(payloadMatch[1])
        if (extracted) {
          candidates.push(extracted)
        }
      } catch {
        candidates.push(payloadMatch[1])
      }
    }

    let bestError: string | null = null
    for (const candidate of candidates) {
      const result = parseVerificationQrPayload(candidate)
      if (result.payload) {
        return { normalized: candidate, payload: result.payload, error: null }
      }
      if (!bestError && result.error) {
        bestError = result.error
      }
    }

    return { normalized: trimmed, payload: null, error: bestError ?? 'Invalid QR payload.' }
  }, [])

  const parseQrInput = useCallback(
    (rawValue: string) => {
      const { normalized, payload, error } = tryParseQrPayload(rawValue)
      setQrPayloadInput(normalized)
      setDecodedQrPayload(payload)
      setQrScanError(error)
      if (payload) {
        setCameraError(null)
      }
    },
    [tryParseQrPayload],
  )

  const decodeQrFromCanvas = useCallback(async (canvas: HTMLCanvasElement): Promise<string | null> => {
    const detectorWindow = window as typeof window & {
      BarcodeDetector?: BarcodeDetectorConstructor
    }

    if (detectorWindow.BarcodeDetector) {
      try {
        const detector = new detectorWindow.BarcodeDetector({ formats: ['qr_code'] })
        const [result] = await detector.detect(canvas)
        if (result?.rawValue) {
          return result.rawValue
        }
      } catch {
        // fall through to jsQR fallback
      }
    }

    const context = canvas.getContext('2d', { willReadFrequently: true })
    if (!context) return null

    const imageData = context.getImageData(0, 0, canvas.width, canvas.height)
    const decoded = jsQR(imageData.data, imageData.width, imageData.height, { inversionAttempts: 'attemptBoth' })
    return decoded?.data ?? null
  }, [])

  const stopQrCamera = useCallback(() => {
    if (qrScanFrameRef.current !== null) {
      window.cancelAnimationFrame(qrScanFrameRef.current)
      qrScanFrameRef.current = null
    }

    if (qrVideoStreamRef.current) {
      qrVideoStreamRef.current.getTracks().forEach((track) => track.stop())
      qrVideoStreamRef.current = null
    }

    if (qrVideoRef.current) {
      qrVideoRef.current.srcObject = null
    }

    setIsCameraOpen(false)
    isScanningFrameRef.current = false
  }, [])

  const scanCameraFrame = useCallback(async () => {
    const video = qrVideoRef.current
    const canvas = qrCanvasRef.current

    if (!video || !canvas || !isCameraOpen) {
      return
    }

    qrScanFrameRef.current = window.requestAnimationFrame(() => {
      void scanCameraFrame()
    })

    if (isScanningFrameRef.current || video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) {
      return
    }

    isScanningFrameRef.current = true
    try {
      const width = video.videoWidth
      const height = video.videoHeight
      if (!width || !height) return

      canvas.width = width
      canvas.height = height

      const context = canvas.getContext('2d')
      if (!context) return

      context.drawImage(video, 0, 0, width, height)
      const rawValue = await decodeQrFromCanvas(canvas)
      if (!rawValue) return

      parseQrInput(rawValue)
      stopQrCamera()
      toast({
        title: 'QR scanned',
        description: 'QR payload captured from camera successfully.',
      })
    } catch (error) {
      setCameraError(error instanceof Error ? error.message : 'Camera scanning failed.')
    } finally {
      isScanningFrameRef.current = false
    }
  }, [decodeQrFromCanvas, isCameraOpen, parseQrInput, stopQrCamera])

  const startQrCamera = useCallback(async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraError('Camera access is not supported in this browser.')
      return
    }

    setCameraError(null)
    setIsCameraStarting(true)
    setIsCameraOpen(true)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: 'environment' },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      })

      await new Promise((resolve) => window.requestAnimationFrame(() => resolve(undefined)))

      const video = qrVideoRef.current
      if (!video) {
        stream.getTracks().forEach((track) => track.stop())
        throw new Error('Camera preview could not be initialized.')
      }

      qrVideoStreamRef.current = stream
      video.srcObject = stream

      await new Promise<void>((resolve) => {
        if (video.readyState >= HTMLMediaElement.HAVE_METADATA) {
          resolve()
          return
        }

        const onLoadedMetadata = () => {
          video.removeEventListener('loadedmetadata', onLoadedMetadata)
          resolve()
        }
        video.addEventListener('loadedmetadata', onLoadedMetadata)
      })

      await video.play()
      qrScanFrameRef.current = window.requestAnimationFrame(() => {
        void scanCameraFrame()
      })
    } catch (error) {
      if (error instanceof Error && error.name === 'NotAllowedError') {
        setCameraError('Camera permission was denied. Please allow camera access and try again.')
      } else {
        setCameraError(error instanceof Error ? error.message : 'Unable to start camera scanner.')
      }
      stopQrCamera()
    } finally {
      setIsCameraStarting(false)
    }
  }, [scanCameraFrame, stopQrCamera])

  const handleDecodeQrImage = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ''

    if (!file) return

    setIsDecodingQrImage(true)
    setQrScanError(null)

    let bitmap: ImageBitmap | null = null

    try {
      try {
        bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' })
      } catch {
        bitmap = await createImageBitmap(file)
      }

      const canvas = qrCanvasRef.current ?? document.createElement('canvas')
      const context = canvas.getContext('2d')
      if (!context) {
        throw new Error('Canvas context unavailable for QR decoding.')
      }

      const scales = [1, 1.5, 2]
      let rawValue: string | null = null

      for (const scale of scales) {
        const width = Math.max(1, Math.floor(bitmap.width * scale))
        const height = Math.max(1, Math.floor(bitmap.height * scale))

        canvas.width = width
        canvas.height = height
        context.clearRect(0, 0, width, height)
        context.drawImage(bitmap, 0, 0, width, height)

        rawValue = await decodeQrFromCanvas(canvas)
        if (rawValue) break
      }

      if (!rawValue) {
        setDecodedQrPayload(null)
        setQrScanError('No QR code was detected in that image. Try a clearer screenshot or paste the payload.')
        return
      }

      parseQrInput(rawValue)
      toast({
        title: 'QR decoded',
        description: 'QR payload extracted from image successfully.',
      })
    } catch (error) {
      setDecodedQrPayload(null)
      setQrScanError(error instanceof Error ? error.message : 'Failed to decode the QR image.')
    } finally {
      bitmap?.close()
      setIsDecodingQrImage(false)
    }
  }

  useEffect(() => {
    return () => {
      stopQrCamera()
    }
  }, [stopQrCamera])

  const closeModal = () => {
    if (isUploading) return
    setUploadOpen(false)
    setDocumentFile(null)
    setPhotoFile(null)
    setBiometricFile(null)
    setGeoTag('')
    setSelectedClaimId('')
    setUploadProgress(0)
  }

  // ── Upload & Submit ─────────────────────────────────────────────────────
  const handleUpload = async () => {
    if (!isApproved) return
    if (!selectedClaimId || !did || !selectedDef) return

    const missingUploads: string[] = []
    if (selectedDef.documentRequired && !documentFile) missingUploads.push('Document')
    if (selectedDef.photoRequired && !photoFile) missingUploads.push('Photo')
    if (selectedDef.biometricRequired && !biometricFile) missingUploads.push('Biometric')
    if (selectedDef.geoRequired && !geoTag.trim()) missingUploads.push('Geo tag')

    if (missingUploads.length > 0) {
      toast({
        title: 'Missing required inputs',
        description: missingUploads.join(', '),
        variant: 'destructive',
      })
      return
    }

    setIsUploading(true)
    setUploadProgress(10)

    try {
      // Step 1: Upload to IPFS
      setUploadProgress(20)
      let documentHash = ''
      let photoHash = ''
      let geolocationHash = ''
      let biometricHash = ''

      if (documentFile) {
        const { metadataCid } = await uploadToIPFS(documentFile, {
          claimId: selectedClaimId,
          claimType: selectedDef.name,
          assetType: 'document',
        })
        documentHash = metadataCid
      }

      if (photoFile) {
        const { metadataCid } = await uploadToIPFS(photoFile, {
          claimId: selectedClaimId,
          claimType: selectedDef.name,
          assetType: 'photo',
        })
        photoHash = metadataCid
      }

      if (biometricFile) {
        const { metadataCid } = await uploadToIPFS(biometricFile, {
          claimId: selectedClaimId,
          claimType: selectedDef.name,
          assetType: 'biometric',
        })
        biometricHash = metadataCid
      }

      if (geoTag.trim()) {
        geolocationHash = await uploadJsonToIPFS(
          {
            claimId: selectedClaimId,
            claimType: selectedDef.name,
            assetType: 'geotag',
            value: geoTag.trim(),
            uploadedAt: new Date().toISOString(),
          },
          `geo_${selectedClaimId}.json`,
        )
      }
      setUploadProgress(60)

      // Step 2: Submit claim request on-chain
      const requestId = `req-${Date.now()}-${did.slice(-6)}`
      const now = BigInt(Math.floor(Date.now() / 1000))
      const expiresAt = now + BigInt(30 * 24 * 60 * 60)

      const transaction = prepareContractCall({
        contract,
        method:
          'function createClaimRequest(string requestId, string claimId, string citizenDid, string documentHash, string photoHash, string geolocationHash, string biometricHash, uint256 expiresAt)',
        params: [requestId, selectedClaimId, did, documentHash, photoHash, geolocationHash, biometricHash, expiresAt],
      })

      await sendAndConfirmTransactionAsync(transaction)

      setUploadProgress(100)
      addRequestId(requestId)

      toast({
        title: 'Request submitted',
        description: `Request ${requestId} created for ${selectedDef.name}.`,
      })

      await new Promise((r) => setTimeout(r, 400))
      closeModal()
      refetchRequests()
    } catch (err) {
      toast({
        title: 'Submission failed',
        description: err instanceof Error ? err.message : 'Transaction failed',
        variant: 'destructive',
      })
    } finally {
      setIsUploading(false)
      setUploadProgress(0)
    }
  }

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="p-8 text-center max-w-md">
          <Hexagon className="h-10 w-10 text-primary mx-auto mb-3" />
          <p className="text-sm font-medium mb-2">Wallet not connected</p>
          <p className="text-xs text-muted-foreground mb-4">Connect your wallet to access the citizen dashboard.</p>
          <Button className="gradient-primary text-primary-foreground" onClick={() => navigate('/', { replace: true })}>
            Connect Wallet
          </Button>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* ── Nav ── */}
      <nav className="sticky top-0 z-10 flex items-center justify-between px-6 py-4 border-b border-border bg-card/80 backdrop-blur-sm">
        <div className="flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-lg gradient-primary flex items-center justify-center">
            <Hexagon className="h-4 w-4 text-primary-foreground" />
          </div>
          <span className="text-lg font-bold tracking-tight">VaultX</span>
          <span className="text-[11px] bg-primary/10 text-primary px-2 py-0.5 rounded-full font-semibold ml-1 tracking-wide">CITIZEN</span>
        </div>
        <Button variant="ghost" size="sm" onClick={handleSignOut} className="text-xs text-muted-foreground hover:text-foreground gap-1.5">
          <LogOut className="h-3.5 w-3.5" />
          Sign Out
        </Button>
      </nav>

      {/* ── Content ── */}
      <div className="flex-1 p-6">
        <div className="max-w-5xl mx-auto space-y-8">
          {/* Page header */}
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Identity Wallet</h1>
              <p className="text-sm text-muted-foreground mt-0.5">Upload documents and manage your verifiable credentials</p>
            </div>
            <Button onClick={() => setUploadOpen(true)} disabled={!isApproved} className="gradient-primary text-primary-foreground text-sm font-semibold shrink-0">
              <Plus className="h-4 w-4 mr-1.5" />
              Upload Document
            </Button>
          </motion.div>

          {!isApproved && (
            <Card className="p-4 border-warning/40 bg-warning/5 text-sm text-warning">
              Your account is not approved yet. Upload and document actions are disabled until governance approval is completed.
            </Card>
          )}

          {isApproved && availableDefs.length === 0 && (
            <Card className="p-4 border-warning/40 bg-warning/5 text-sm text-warning">No claim types are available yet. Ask governance to create claim types first.</Card>
          )}

          {/* DID card */}
          {did && (
            <motion.div {...cardAnim(0)}>
              <Card className="p-5 shadow-card border-border bg-card">
                <div className="flex items-start justify-between flex-wrap gap-4">
                  <div className="flex items-center gap-3">
                    <div className="h-12 w-12 rounded-xl gradient-primary flex items-center justify-center shrink-0 shadow-card">
                      <Fingerprint className="h-6 w-6 text-primary-foreground" />
                    </div>
                    <div>
                      <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-widest mb-0.5">Decentralized Identifier</p>
                      <code className="text-xs font-mono text-card-foreground break-all">{did}</code>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <StatusBadge status="active" />
                    <div className="text-right text-xs text-muted-foreground space-y-0.5">
                      <p>{myRequests.length} requests</p>
                      <p>{activeCredentials.length} credentials</p>
                    </div>
                  </div>
                </div>
              </Card>
            </motion.div>
          )}

          <motion.div {...cardAnim(1)}>
            <Card className="p-6 shadow-card border-border bg-card">
              <div className="flex items-start justify-between gap-4 mb-4">
                <div>
                  <h2 className="text-base font-semibold">Scan Verifier QR</h2>
                  <p className="text-sm text-muted-foreground mt-1">Scan or paste a verifier QR payload to see which credentials are being requested from your wallet.</p>
                </div>
                <ScanLine className="h-5 w-5 text-primary shrink-0" />
              </div>

              <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
                <div className="space-y-3">
                  <input ref={qrFileInputRef} type="file" accept="image/*" className="hidden" onChange={handleDecodeQrImage} />

                  <div>
                    <Label className="text-xs">QR Payload</Label>
                    <Textarea
                      value={qrPayloadInput}
                      onChange={(event) => setQrPayloadInput(event.target.value)}
                      placeholder='Paste scanned QR JSON here, for example: {"verificationRequestId":"vreq-...","requestedClaims":["claim-1"]}'
                      className="mt-1 min-h-[148px] text-xs font-mono"
                    />
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <Button type="button" variant="outline" onClick={() => qrFileInputRef.current?.click()} disabled={isDecodingQrImage}>
                      {isDecodingQrImage ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                          Decoding QR...
                        </>
                      ) : (
                        <>
                          <ScanLine className="h-4 w-4 mr-1.5" />
                          Scan QR Image
                        </>
                      )}
                    </Button>
                    <Button type="button" className="gradient-primary text-primary-foreground" onClick={() => parseQrInput(qrPayloadInput)}>
                      <QrCode className="h-4 w-4 mr-1.5" />
                      Read Request
                    </Button>
                    {isCameraOpen ? (
                      <Button type="button" variant="outline" onClick={stopQrCamera}>
                        <X className="h-4 w-4 mr-1.5" />
                        Stop Camera
                      </Button>
                    ) : (
                      <Button type="button" variant="outline" onClick={() => void startQrCamera()} disabled={isCameraStarting}>
                        {isCameraStarting ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                            Starting Camera...
                          </>
                        ) : (
                          <>
                            <ScanLine className="h-4 w-4 mr-1.5" />
                            Scan with Camera
                          </>
                        )}
                      </Button>
                    )}
                  </div>

                  {(isCameraOpen || isCameraStarting) && (
                    <div className="rounded-lg border border-border bg-background p-3 space-y-2">
                      <video ref={qrVideoRef} autoPlay playsInline muted className="w-full rounded-md border border-border bg-black/80 max-h-64 object-cover" />
                      <p className="text-xs text-muted-foreground">
                        {isCameraStarting ? 'Initializing camera preview...' : 'Point the camera at the verifier QR code. It will auto-scan once detected.'}
                      </p>
                    </div>
                  )}

                  {cameraError && (
                    <div className="flex items-start gap-2 text-xs text-destructive bg-destructive/10 border border-destructive/20 rounded-md px-3 py-2.5">
                      <AlertCircle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                      <span>{cameraError}</span>
                    </div>
                  )}

                  {qrScanError && (
                    <div className="flex items-start gap-2 text-xs text-destructive bg-destructive/10 border border-destructive/20 rounded-md px-3 py-2.5">
                      <AlertCircle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                      <span>{qrScanError}</span>
                    </div>
                  )}
                </div>

                <canvas ref={qrCanvasRef} className="hidden" />

                <div className="rounded-xl border border-border bg-muted/20 p-4 space-y-4">
                  <div>
                    <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Decoded Request</p>
                    <p className="text-sm font-medium text-card-foreground mt-1">{decodedQrPayload ? decodedQrPayload.verificationRequestId : 'No QR request loaded'}</p>
                  </div>

                  {decodedQrPayload ? (
                    <div className="space-y-4">
                      {isQrRequestPending ? (
                        <div className="flex items-start gap-2 text-xs text-muted-foreground bg-muted/40 border border-border rounded-md px-3 py-2.5">
                          <Loader2 className="h-3.5 w-3.5 mt-0.5 shrink-0 animate-spin" />
                          <span>Validating request state on-chain...</span>
                        </div>
                      ) : qrRequestBlockingMessage ? (
                        <div className="flex items-start gap-2 text-xs text-destructive bg-destructive/10 border border-destructive/20 rounded-md px-3 py-2.5">
                          <AlertCircle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                          <span>{qrRequestBlockingMessage}</span>
                        </div>
                      ) : null}

                      <div className="grid gap-3 sm:grid-cols-2">
                        <div>
                          <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Verifier DID</p>
                          <p className="text-xs font-mono text-card-foreground break-all mt-1">{decodedQrPayload.verifierDid}</p>
                        </div>
                        <div>
                          <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Expires</p>
                          <p className="text-xs text-card-foreground mt-1">{formatUnixTime(decodedQrPayload.expiresAt)}</p>
                        </div>
                      </div>

                      <div>
                        <p className="text-[11px] uppercase tracking-wide text-muted-foreground mb-2">Requested Credentials</p>
                        <div className="space-y-2">
                          {requestedQrClaims.map(({ claimId, definition, inWallet }) => (
                            <div key={claimId} className="rounded-lg border border-border bg-background px-3 py-3">
                              <div className="flex items-start justify-between gap-3">
                                <div>
                                  <p className="text-sm font-medium text-card-foreground">{definition?.name || claimId}</p>
                                  <p className="text-[11px] font-mono text-muted-foreground break-all mt-0.5">{claimId}</p>
                                  {definition?.description && <p className="text-xs text-muted-foreground mt-1">{definition.description}</p>}
                                </div>
                                <StatusBadge status={inWallet ? 'active' : 'pending'} />
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="rounded-lg border border-dashed border-border bg-background/60 p-5 text-center">
                      <QrCode className="h-8 w-8 text-muted-foreground/40 mx-auto mb-3" />
                      <p className="text-sm font-medium text-card-foreground">Scan a verifier QR to inspect the request</p>
                      <p className="text-xs text-muted-foreground mt-1">You’ll see every requested credential here and whether it already exists in your wallet.</p>
                    </div>
                  )}
                </div>
              </div>
            </Card>
          </motion.div>

          {/* ── Credential Presentation section ── */}
          {decodedQrPayload && activeCredentials.length > 0 && (
            <motion.div {...cardAnim(2)}>
              <Card className="p-6 shadow-card border-border bg-card">
                <div className="flex items-start justify-between gap-4 mb-4">
                  <div>
                    <h2 className="text-base font-semibold">Present Credentials</h2>
                    <p className="text-sm text-muted-foreground mt-1">Select which credentials to present to the verifier and sign your submission.</p>
                  </div>
                  <Signature className="h-5 w-5 text-primary shrink-0" />
                </div>

                <div className="space-y-4">
                  {/* Show credentials that match requested claims */}
                  <div>
                    <p className="text-xs font-semibold text-card-foreground mb-3">Available Credentials for Request</p>
                    <div className="space-y-2">
                      {requestedQrClaims.map(({ claimId, definition, inWallet }) => {
                        if (!inWallet) return null
                        const matchingCredential = activeCredentials.find((c) => c.claimId === claimId)
                        if (!matchingCredential) return null

                        return (
                          <label key={matchingCredential.credentialId} className="flex items-start gap-3 p-3 border border-border rounded-lg cursor-pointer hover:bg-muted/30 transition-colors">
                            <input
                              type="checkbox"
                              checked={selectedPresentationCredentials.has(matchingCredential.credentialId)}
                              onChange={() => togglePresentationCredential(matchingCredential.credentialId)}
                              className="mt-0.5"
                            />
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-medium text-card-foreground">{definition?.name || claimId}</p>
                              <p className="text-xs font-mono text-muted-foreground break-all mt-0.5">{matchingCredential.credentialId}</p>
                              <p className="text-xs text-muted-foreground mt-1">
                                Issued {matchingCredential.issuedAt > 0n ? new Date(Number(matchingCredential.issuedAt) * 1000).toLocaleDateString() : '—'}
                              </p>
                            </div>
                            <StatusBadge status="active" />
                          </label>
                        )
                      })}
                    </div>
                  </div>

                  {presentationError && (
                    <div className="flex items-start gap-2 text-xs text-destructive bg-destructive/10 border border-destructive/20 rounded-md px-3 py-2.5">
                      <AlertCircle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                      <span>{presentationError}</span>
                    </div>
                  )}

                  {presentationStatus && (
                    <div className="flex items-start gap-2 text-xs text-success bg-success/10 border border-success/20 rounded-md px-3 py-2.5">
                      <CheckCircle2 className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                      <span>{presentationStatus}</span>
                    </div>
                  )}

                  <Button
                    onClick={handleSignAndSubmitPresentation}
                    disabled={isSigningAndSubmitting || selectedPresentationCredentials.size === 0 || !did || Boolean(qrRequestBlockingMessage) || isQrRequestPending}
                    className="gradient-primary text-primary-foreground w-full"
                  >
                    {isSigningAndSubmitting ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                        Signing & Submitting...
                      </>
                    ) : (
                      <>
                        <Send className="h-4 w-4 mr-1.5" />
                        Sign & Submit Presentation ({selectedPresentationCredentials.size})
                      </>
                    )}
                  </Button>
                </div>
              </Card>
            </motion.div>
          )}

          {/* ── Credentials section ── */}
          {activeCredentials.length > 0 && (
            <motion.div {...cardAnim(2)} className="space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="font-semibold text-sm flex items-center gap-2">
                  <Award className="h-4 w-4 text-primary" />
                  My Credentials
                </h2>
                <span className="text-xs text-muted-foreground">{activeCredentials.length} active</span>
              </div>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {activeCredentials.map((cred, i) => {
                  const claimDef = definitions.find((d) => d.claimId === cred.claimId)
                  return (
                    <motion.div key={cred.credentialId} {...cardAnim(i)}>
                      <Card className="p-4 shadow-card border-border bg-card hover:shadow-elevated transition-shadow">
                        <div className="flex items-start justify-between mb-3">
                          <div className="h-9 w-9 rounded-lg bg-success/10 flex items-center justify-center">
                            <CheckCircle2 className="h-5 w-5 text-success" />
                          </div>
                          <StatusBadge status={credentialStatusLabel(cred.status)} />
                        </div>
                        <p className="text-xs font-semibold text-card-foreground mb-0.5">{claimDef?.claimType || cred.claimId}</p>
                        <div className="flex items-center gap-1.5 mt-2">
                          <Hash className="h-3 w-3 text-muted-foreground/60 shrink-0" />
                          <code className="text-[10px] font-mono text-muted-foreground truncate">{cred.credentialId}</code>
                        </div>
                        <p className="text-[10px] text-muted-foreground mt-1">Issued {cred.issuedAt > 0n ? new Date(Number(cred.issuedAt) * 1000).toLocaleDateString() : '—'}</p>
                      </Card>
                    </motion.div>
                  )
                })}
              </div>
            </motion.div>
          )}

          {/* ── Claim Requests section ── */}
          <motion.div {...cardAnim(3)} className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-sm flex items-center gap-2">
                <Eye className="h-4 w-4 text-primary" />
                My Document Requests
              </h2>
              <span className="text-xs text-muted-foreground">{myRequests.length} requests</span>
            </div>

            <Card className="shadow-card border-border bg-card overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="text-xs">Request ID</TableHead>
                    <TableHead className="text-xs">Document Type</TableHead>
                    <TableHead className="text-xs">IPFS Hash</TableHead>
                    <TableHead className="text-xs">Submitted</TableHead>
                    <TableHead className="text-xs">Approvers</TableHead>
                    <TableHead className="text-xs">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {myRequests.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-10">
                        <Shield className="h-8 w-8 text-muted-foreground/20 mx-auto mb-2" />
                        <p className="text-xs text-muted-foreground">No documents uploaded yet. Click "Upload Document" to get started.</p>
                      </TableCell>
                    </TableRow>
                  ) : (
                    myRequests.map((req) => {
                      const claimDef = definitions.find((d) => d.claimId === req.claimId)
                      return (
                        <TableRow key={req.requestId} className="hover:bg-muted/30 transition-colors">
                          <TableCell className="text-xs font-mono text-muted-foreground">{req.requestId}</TableCell>
                          <TableCell className="text-xs font-medium">{claimDef?.claimType || req.claimId}</TableCell>
                          <TableCell className="text-xs font-mono text-muted-foreground max-w-[120px] truncate">{req.documentHash ? `${req.documentHash.slice(0, 16)}...` : '—'}</TableCell>
                          <TableCell className="text-xs text-muted-foreground">{req.createdAt > 0n ? new Date(Number(req.createdAt) * 1000).toLocaleDateString() : '—'}</TableCell>
                          <TableCell className="text-xs">
                            {req.approverDids.length > 0 ? (
                              <div className="flex items-center gap-2">
                                <div className="w-16">
                                  <Progress value={claimDef ? (req.approverDids.length / Number(claimDef.numberOfApprovalsNeeded || 1)) * 100 : 0} className="h-1.5" />
                                </div>
                                <span className="text-[10px] text-muted-foreground">
                                  {req.approverDids.length}
                                  {claimDef ? `/${Number(claimDef.numberOfApprovalsNeeded)}` : ''}
                                </span>
                              </div>
                            ) : (
                              <span className="text-muted-foreground/50 text-[10px]">Awaiting assignment</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <StatusBadge status={claimRequestStatusLabel(req.status)} />
                          </TableCell>
                        </TableRow>
                      )
                    })
                  )}
                </TableBody>
              </Table>
            </Card>
          </motion.div>
        </div>
      </div>

      {/* ── Upload Documents Modal ── */}
      <Dialog
        open={uploadOpen}
        onOpenChange={(o) => {
          if (!o) closeModal()
        }}
      >
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Upload className="h-4 w-4 text-primary" />
              Upload Document
            </DialogTitle>
            <DialogDescription>Select a claim type and upload only the artifacts required by that claim. Each uploaded artifact is stored on IPFS and its CID is recorded on-chain.</DialogDescription>
          </DialogHeader>

          <div className="space-y-5 mt-1">
            {/* Claim type selector */}
            <div>
              <Label className="text-xs mb-1.5 block">Claim Type *</Label>
              {defsLoading ? (
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading...
                </div>
              ) : (
                <Select
                  value={selectedClaimId}
                  onValueChange={(v) => {
                    setSelectedClaimId(v)
                    setDocumentFile(null)
                    setPhotoFile(null)
                    setBiometricFile(null)
                    setGeoTag('')
                  }}
                  disabled={isUploading}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={availableDefs.length ? 'Select claim type...' : 'No claim types'} />
                  </SelectTrigger>
                  <SelectContent>
                    {availableDefs.map((d) => (
                      <SelectItem key={d.id} value={d.id}>
                        {d.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            {/* Claim requirements */}
            {selectedDef && (
              <div className="rounded-lg bg-muted/50 border border-border p-3">
                <p className="text-xs text-muted-foreground">
                  Required by <span className="font-medium text-card-foreground">{selectedDef.name}</span>: {selectedDef.documentRequired ? 'Document' : ''}
                  {selectedDef.documentRequired && selectedDef.photoRequired ? ', ' : ''}
                  {selectedDef.photoRequired ? 'Photo' : ''}
                  {(selectedDef.documentRequired || selectedDef.photoRequired) && selectedDef.geoRequired ? ', ' : ''}
                  {selectedDef.geoRequired ? 'Geo tag' : ''}
                  {(selectedDef.documentRequired || selectedDef.photoRequired || selectedDef.geoRequired) && selectedDef.biometricRequired ? ', ' : ''}
                  {selectedDef.biometricRequired ? 'Biometric' : ''}
                  {!selectedDef.documentRequired && !selectedDef.photoRequired && !selectedDef.geoRequired && !selectedDef.biometricRequired ? 'None (all optional)' : ''}
                </p>
              </div>
            )}

            {/* Document upload */}
            {selectedClaimId && selectedDef?.documentRequired && (
              <div>
                <Label className="text-xs mb-1.5 block">Upload Document *</Label>
                <div
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  onClick={() => !isUploading && fileInputRef.current?.click()}
                  className={[
                    'relative border-2 border-dashed rounded-xl p-6 text-center transition-all',
                    isUploading ? 'opacity-50 cursor-not-allowed border-border' : 'cursor-pointer',
                    isDragging ? 'border-primary bg-primary/8 scale-[1.01]' : 'border-border hover:border-primary/50 hover:bg-muted/30',
                  ].join(' ')}
                >
                  <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileInput} accept=".pdf,.jpg,.jpeg,.png,.doc,.docx" disabled={isUploading} />
                  <div className="flex flex-col items-center gap-2 pointer-events-none">
                    <div className={['h-12 w-12 rounded-xl flex items-center justify-center transition-colors', isDragging ? 'bg-primary/15' : 'bg-muted'].join(' ')}>
                      <FolderOpen className={['h-6 w-6 transition-colors', isDragging ? 'text-primary' : 'text-muted-foreground'].join(' ')} />
                    </div>
                    <p className="text-sm font-medium text-card-foreground">{isDragging ? 'Drop file here' : 'Drag & drop or click to browse'}</p>
                    <p className="text-[10px] text-muted-foreground">PDF, JPG, PNG, DOC - Max 10 MB</p>
                  </div>
                </div>
              </div>
            )}

            {/* Photo upload */}
            {selectedClaimId && selectedDef?.photoRequired && (
              <div>
                <Label className="text-xs mb-1.5 block">Upload Photo *</Label>
                <div
                  onClick={() => !isUploading && photoInputRef.current?.click()}
                  className={[
                    'relative border-2 border-dashed rounded-xl p-4 text-center transition-all',
                    isUploading ? 'opacity-50 cursor-not-allowed border-border' : 'cursor-pointer border-border hover:border-primary/50 hover:bg-muted/30',
                  ].join(' ')}
                >
                  <input ref={photoInputRef} type="file" className="hidden" onChange={handlePhotoInput} accept=".jpg,.jpeg,.png,.webp" disabled={isUploading} />
                  <p className="text-xs text-muted-foreground">Click to select a photo (JPG, PNG, WEBP)</p>
                </div>
              </div>
            )}

            {/* Geotag input */}
            {selectedClaimId && selectedDef?.geoRequired && (
              <div>
                <Label className="text-xs mb-1.5 block">Geo Tag *</Label>
                <div className="flex gap-2">
                  <Input className="h-9 text-xs" value={geoTag} onChange={(e) => setGeoTag(e.target.value)} placeholder="Enter coordinates or location text" disabled={isUploading || isLocating} />
                  <Button type="button" variant="outline" className="h-9 text-xs" onClick={captureCurrentLocation} disabled={isUploading || isLocating}>
                    {isLocating ? (
                      <>
                        <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                        Locating
                      </>
                    ) : (
                      'Use current location'
                    )}
                  </Button>
                </div>
              </div>
            )}

            {/* Biometric upload */}
            {selectedClaimId && selectedDef?.biometricRequired && (
              <div>
                <Label className="text-xs mb-1.5 block">Upload Biometric *</Label>
                <div
                  onClick={() => !isUploading && biometricInputRef.current?.click()}
                  className={[
                    'relative border-2 border-dashed rounded-xl p-4 text-center transition-all',
                    isUploading ? 'opacity-50 cursor-not-allowed border-border' : 'cursor-pointer border-border hover:border-primary/50 hover:bg-muted/30',
                  ].join(' ')}
                >
                  <input ref={biometricInputRef} type="file" className="hidden" onChange={handleBiometricInput} accept=".jpg,.jpeg,.png,.pdf" disabled={isUploading} />
                  <p className="text-xs text-muted-foreground">Click to select biometric proof file</p>
                </div>
              </div>
            )}

            {/* Selected files */}
            <AnimatePresence>
              {documentFile && (
                <motion.div
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 8 }}
                  className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg bg-muted/60 border border-border"
                >
                  <FileIcon name={documentFile.name} />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-card-foreground truncate">Document: {documentFile.name}</p>
                    <p className="text-[10px] text-muted-foreground">{formatBytes(documentFile.size)}</p>
                  </div>
                  {!isUploading && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        setDocumentFile(null)
                      }}
                      className="text-muted-foreground hover:text-destructive transition-colors shrink-0 p-0.5 rounded"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </motion.div>
              )}
            </AnimatePresence>

            <AnimatePresence>
              {photoFile && (
                <motion.div
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 8 }}
                  className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg bg-muted/60 border border-border"
                >
                  <FileIcon name={photoFile.name} />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-card-foreground truncate">Photo: {photoFile.name}</p>
                    <p className="text-[10px] text-muted-foreground">{formatBytes(photoFile.size)}</p>
                  </div>
                  {!isUploading && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        setPhotoFile(null)
                      }}
                      className="text-muted-foreground hover:text-destructive transition-colors shrink-0 p-0.5 rounded"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </motion.div>
              )}
            </AnimatePresence>

            <AnimatePresence>
              {biometricFile && (
                <motion.div
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 8 }}
                  className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg bg-muted/60 border border-border"
                >
                  <FileIcon name={biometricFile.name} />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-card-foreground truncate">Biometric: {biometricFile.name}</p>
                    <p className="text-[10px] text-muted-foreground">{formatBytes(biometricFile.size)}</p>
                  </div>
                  {!isUploading && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        setBiometricFile(null)
                      }}
                      className="text-muted-foreground hover:text-destructive transition-colors shrink-0 p-0.5 rounded"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Upload progress */}
            <AnimatePresence>
              {isUploading && (
                <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-2">
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>{uploadProgress < 30 ? 'Uploading to IPFS...' : uploadProgress < 70 ? 'Submitting on-chain...' : 'Finalizing...'}</span>
                    <span>{uploadProgress}%</span>
                  </div>
                  <Progress value={uploadProgress} className="h-1.5" />
                </motion.div>
              )}
            </AnimatePresence>

            {/* Info note */}
            <div className="flex items-start gap-2 bg-primary/5 border border-primary/15 rounded-lg px-3 py-2.5">
              <AlertCircle className="h-3.5 w-3.5 mt-0.5 shrink-0 text-primary" />
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                Your document is uploaded to IPFS and the CID is recorded on-chain. Governance will assign approvers to verify your submission. Once verified, the document is removed from IPFS and a
                credential is issued to your identity.
              </p>
            </div>

            {/* Actions */}
            <div className="flex gap-2 pt-1">
              <Button variant="outline" className="flex-1" onClick={closeModal} disabled={isUploading}>
                Cancel
              </Button>
              <Button className="flex-1 gradient-primary text-primary-foreground" disabled={!isApproved || !selectedClaimId || isUploading || isTxPending} onClick={handleUpload}>
                {isUploading ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Upload className="h-3.5 w-3.5 mr-1.5" />
                    Upload & Submit
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
