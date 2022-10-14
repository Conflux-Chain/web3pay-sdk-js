#!/usr/bin/env node
import {
	accountInfo,
	balanceOf,
	buildApiKeySignature,
	deposit2app, depositEthV2,
	ethersSign,
	keypress,
	tokensNet71
} from "../lib/lib";
import {ConnectionInfo, fetchJson} from "ethers/lib/utils";
import {buyVipCard, getVipInfo, initWeb3payVipClient} from "../lib/rpc";

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
	await initWeb3payVipClient(RPC_ENDPOINT, app,);
	const vipInfo = await getVipInfo(wallet.address);
	if (vipInfo.expireAt.toNumber() * 1000 < Date.now()) {
		console.log(`vip expired, buy now...`)
		await buyVipCard(wallet)
	} else {
		console.log(`vip expires at ${new Date(vipInfo.expireAt.toNumber() * 1000).toISOString()}`)
	}
	if (appCoin == '0.0') {
		// await keypress(`press any key to continue`)
		console.log(`deposit to app now...`)
		// await deposit2app(wallet, app, tokensNet71)
		await depositEthV2(wallet, app, {});
	}

	const {seed, signature, base58} = await buildApiKeySignature(privateKey!, app!);
	const rpcInfo: ConnectionInfo = {
		url: `http://localhost:${port}`,
		headers: {
			"Customer-Key": base58,
		}
	}
	await request(rpcInfo, "?foo=bar")
	await request(rpcInfo, '/a-valuable-resource?foo=hi')
	await request(rpcInfo, '/billing-1?foo=wa')
	await request(rpcInfo, '/vip-test?foo=wa')
	console.log(`api key length `, rpcInfo.headers!['Customer-Key'].toString().length)
}
async function request(rpcInfo: ConnectionInfo, path = '/') {
	rpcInfo = {...rpcInfo, url: rpcInfo.url + path}
	const result = await fetchJson(rpcInfo)
	console.log(`result of [${rpcInfo.url}] is `, result)
}

if (module === require.main) {
	main().then()
}