import json
import sys
from pathlib import Path

from solcx import compile_standard, install_solc


SOLC_VERSION = "0.8.19"
CONTRACT_FILE = "SSI.sol"
CONTRACT_NAME = "SSI"


def main() -> int:
	base_dir = Path(__file__).resolve().parent
	contract_path = base_dir / CONTRACT_FILE

	if not contract_path.exists():
		print(f"Error: {CONTRACT_FILE} not found in {base_dir}")
		return 1

	print(f"Installing solc {SOLC_VERSION} (if needed)...")
	install_solc(SOLC_VERSION)

	source = contract_path.read_text(encoding="utf-8")

	print(f"Compiling {CONTRACT_FILE}...")
	compiled = compile_standard(
		{
			"language": "Solidity",
			"sources": {
				CONTRACT_FILE: {"content": source},
			},
			"settings": {
				"viaIR": True,
				"optimizer": {"enabled": True, "runs": 200},
				"outputSelection": {"*": {"*": ["abi", "evm.bytecode"]}},
			},
		},
		solc_version=SOLC_VERSION,
		allow_paths=[str(base_dir)],
	)

	try:
		artifact = compiled["contracts"][CONTRACT_FILE][CONTRACT_NAME]
	except KeyError:
		print(
			f"Error: contract '{CONTRACT_NAME}' not found in '{CONTRACT_FILE}'. "
			"Check the contract name in the Solidity file."
		)
		return 1

	abi_path = base_dir / f"{CONTRACT_NAME}_abi.json"
	bytecode_path = base_dir / f"{CONTRACT_NAME}_bytecode.txt"
	full_artifact_path = base_dir / f"{CONTRACT_NAME}_artifact.json"

	with abi_path.open("w", encoding="utf-8") as f:
		json.dump(artifact["abi"], f, indent=2)

	with bytecode_path.open("w", encoding="utf-8") as f:
		f.write(artifact["evm"]["bytecode"]["object"])

	with full_artifact_path.open("w", encoding="utf-8") as f:
		json.dump(artifact, f, indent=2)

	print("Compilation successful.")
	print(f"Saved ABI: {abi_path.name}")
	print(f"Saved bytecode: {bytecode_path.name}")
	print(f"Saved full artifact: {full_artifact_path.name}")
	return 0


if __name__ == "__main__":
	sys.exit(main())
