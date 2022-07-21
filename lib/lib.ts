import {ethers, Wallet} from "ethers";
import {base64, formatEther, parseEther} from "ethers/lib/utils";

export const tokensNet71 = {
	usdt: "0x7d682e65efc5c13bf4e394b8f376c48e6bae0355", // net71 faucet usdt,
	ppi: "0x49916ba65d0048c4bbb0a786a527d98d10a1cd2d", // ppi
	btc: "0x54593e02c39aeff52b166bd036797d2b1478de8d", // fauct btc
	wcfx: "0x2ed3dddae5b2f321af0806181fbfa6d049be47d8",
	testApp: "0x0979193d54Bf5cD4D4958944C52Ac66DEeDE4F2A",
	__router: "0x873789aaf553fd0b4252d0d2b72c6331c47aff2e", // swappi router
}

const abi = [
	"function balanceOf(address account) view returns (uint)",
	"function name() view returns (string)",
	"function apiCoin() view returns (address)",

	"function depositNativeValue(address swap, uint amountOut, address[] calldata path, address toApp, uint deadline) public payable",
]
export function getDeadline(diff: number = 1000) {
	return Math.round(Date.now()/1000 ) + diff
}
export async function deposit2app(wallet: Wallet, app: string, config: any) {
	const contract = new ethers.Contract(app, abi, wallet)
	const apiAddr = await contract.apiCoin();
	const api = new  ethers.Contract(apiAddr, abi, wallet)
	const {__router: swapRouter, wcfx, usdt} = config
	const receipt = await api.depositNativeValue(
		swapRouter, parseEther("0.001"),
		[wcfx, usdt], app, getDeadline(), {value: parseEther("0.1")}
	).then(tx=>tx.wait());
	console.log(`deposit tx hash ${receipt.transactionHash}`)
}
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
	if (ether == '0.0') {
		console.log(`visit testnet faucet: https://efaucet.confluxnetwork.org/`)
	}
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