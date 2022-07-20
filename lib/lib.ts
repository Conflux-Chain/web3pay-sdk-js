import {ethers} from "ethers";
import {base64, formatEther} from "ethers/lib/utils";

const abi = [
	"function balanceOf(address account) view returns (uint)",
	"function name() view returns (string)",
]

export async function balanceOf(app: string, account: string, rpcEndpoint: string) {
	const contract = new ethers.Contract(app, abi, ethers.getDefaultProvider(rpcEndpoint))
	const balance = await contract.balanceOf(account).then(formatEther)
	const name = await contract.name()
	console.log(`balance of ${account} , contract ${app} [${name}] , `, balance)
	return balance
}
export async function buildApiKey(msg:string, pk:string) {
	const sig = await ethersSign(msg, pk);
	const str = JSON.stringify({msg, sig});
	console.log(`raw json key length `, str.length)
	return base64.encode(Buffer.from(str))
}
export async function ethersSign(msg: string, pk:string) {
	const wallet = new ethers.Wallet(pk)
	console.log(`sign with ${wallet.address}`)

	const sign = await wallet.signMessage(msg)
	console.log(`input ${msg}`)
	console.log(`ethers  signature ${sign} length ${sign.length}`)
	return sign
}

export async function accountInfo(pk:string, rpcEndpoint: string) {
	console.log(`rpc endpoint ${rpcEndpoint}, check availability...`)
	let provider = ethers.getDefaultProvider(rpcEndpoint);
	console.log(`network ${await provider.getNetwork().then(res=>res.chainId)}`)

	const wallet = new ethers.Wallet(pk, provider)
	console.log(`account ${wallet.address}`)
	const ether = await wallet.getBalance().then(formatEther)
	console.log(`balance ${ether}`)
	return wallet;
}

export const keypress = async (msg = '') => {
	console.log(msg)
	process.stdin.setRawMode(true)
	return new Promise(resolve => process.stdin.once('data', () => {
		process.stdin.setRawMode(false)
		resolve(0)
	}))
}