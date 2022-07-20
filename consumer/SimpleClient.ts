import {fetchJson} from "ethers/lib/utils";
import {ConnectionInfo} from "@ethersproject/web/src.ts/index";
import {ethers} from "ethers";
import {accountInfo, balanceOf, buildApiKey, ethersSign, keypress} from "../lib/lib";

require('dotenv').config()

async function buildSignature(privateKey: string, app: string) {
	const seed = `${app}_${Date.now()}`
	const signature = await ethersSign(seed, privateKey);
	return {seed, signature}
}

async function main() {
	let {PROVIDER_PORT: port, CONSUMER_PK: privateKey, APP: app, RPC_ENDPOINT} = process.env;
	console.log(`provider port is ${port}`)
	const wallet = await accountInfo(privateKey!, RPC_ENDPOINT!)
	const appCoin = await balanceOf(app!, wallet.address, RPC_ENDPOINT!)

	if (appCoin == '0.0') {
		// await keypress(`press any key to continue`)
	}

	const {seed, signature} = await buildSignature(privateKey!, app!);
	const rpcInfo: ConnectionInfo = {
		url: `http://localhost:${port}`,
		headers: {
			"seed": seed,
			"sig": signature,
			"key": await buildApiKey(seed, privateKey!),
		}
	}
	await request(rpcInfo)
	await request(rpcInfo, '/a-valuable-resource')
	console.log(`api key length `, rpcInfo.headers!['key'].toString().length)
}
async function request(rpcInfo: ConnectionInfo, path = '/') {
	rpcInfo = {...rpcInfo, url: rpcInfo.url + path}
	const result = await fetchJson(rpcInfo)
	console.log(`result of [${rpcInfo.url}] is `, result)
}

if (module === require.main) {
	main().then()
}