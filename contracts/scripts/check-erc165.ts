/**
 * Diagnose why registerPolicy reverts:
 * 1. Compute IUnderwriterPolicy interface ID
 * 2. Call supportsInterface on deployed policy
 * 3. Try static call to registerPolicy to decode revert reason
 */
import { ethers } from "hardhat";
import * as dotenv from "dotenv";
dotenv.config();

const POLICY_REGISTRY  = "0x962A6c7Be4fC765B0E8B601ab4BB210938660190";
const POLICY_ADDRESS   = "0xf131E7A869Ce4Ff54A7cdA9eC966576A9604B2b5";

async function main() {
  const [signer] = await ethers.getSigners();

  // Compute the IUnderwriterPolicy interface ID (XOR of all 4-byte function selectors)
  const iface = new ethers.Interface([
    "function onPolicySet(uint256 coverageId, bytes calldata data) external",
    "function evaluateRisk(uint256 escrowId, bytes calldata riskProof) external returns (uint256)",
    "function judge(uint256 coverageId, bytes calldata disputeProof) external returns (bool)",
  ]);
  const sels = [
    iface.getFunction("onPolicySet")!.selector,
    iface.getFunction("evaluateRisk")!.selector,
    iface.getFunction("judge")!.selector,
  ];
  const interfaceId = sels.reduce((acc, s) =>
    "0x" + (parseInt(acc, 16) ^ parseInt(s, 16)).toString(16).padStart(8, "0"),
    "0x00000000"
  );
  console.log("Computed IUnderwriterPolicy interfaceId:", interfaceId);
  console.log("Function selectors:", sels);

  // Check if deployed policy says it supports this interface
  const erc165ABI = ["function supportsInterface(bytes4 id) external view returns (bool)"];
  const policy = new ethers.Contract(POLICY_ADDRESS, erc165ABI, signer);
  try {
    const supports = await policy.supportsInterface(interfaceId);
    console.log("Policy.supportsInterface(IUnderwriterPolicy):", supports);
  } catch (e: any) {
    console.log("supportsInterface call failed:", e.message);
  }

  // Also check ERC165 standard 0x01ffc9a7
  try {
    const supportsERC165 = await policy.supportsInterface("0x01ffc9a7");
    console.log("Policy.supportsInterface(ERC165):", supportsERC165);
  } catch (e: any) {
    console.log("ERC165 check failed:", e.message);
  }

  // Decode revert from registerPolicy via staticCall
  const registryABI = [
    "function registerPolicy(address policy_) external",
    "function isPolicy(address policy_) external view returns (bool)",
  ];
  const registry = new ethers.Contract(POLICY_REGISTRY, registryABI, signer);
  try {
    await registry.registerPolicy.staticCall(POLICY_ADDRESS);
    console.log("registerPolicy staticCall: WOULD SUCCEED");
  } catch (e: any) {
    console.log("registerPolicy staticCall revert:", e.message?.slice(0, 200));
    if (e.data) console.log("revert data:", e.data);
  }
}

main()
  .then(() => process.exit(0))
  .catch((e) => { console.error(e); process.exit(1); });
