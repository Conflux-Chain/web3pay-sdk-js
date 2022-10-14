#!/usr/bin/env node
import * as http from "http";
import {IncomingMessage, RequestListener, ServerResponse} from "http";
import {accountInfo, buildBillingKey, decodeApiKey} from "../lib/lib";
import {billing, getVipInfo, initWeb3payClient, initWeb3payVipClient} from "../lib/rpc";

require('dotenv').config()
let {PROVIDER_PORT: port, PROVIDER_PK: pk, APP: app, RPC_ENDPOINT, RPC_BILLING} = process.env;
const billingUrls = new Set(["/a-valuable-resource", "/billing-1", "/billing-2", "/billing-3"])
const vipUrls = new Set(["/vip-test"])
async function requestListener(req: IncomingMessage, res:http.ServerResponse) {
	const urlObj = new URL(req.url, `http://${req.headers.host}`)
	const {pathname: url} = urlObj;
	console.log(`request ${url}`)

	if (billingUrls.has(url)
	) {
		let billingResult: any;
		try {
			let apiKey = req.headers['customer-key'];
			console.log(`api key ${apiKey}`)
			billingResult = await billing(url, false, apiKey);
		} catch (e) {
			console.log(`billing fail ${typeof e}`, e)
			billingResult = {code: 500, message: `${e}`}
		}
		let code = 0
		let message = 'Billing succeeded!'
		if (billingResult.code) {
			message = `Billing failed: ${billingResult.message}`
		}

		res.writeHead(200);
		const data = {code, message, headers: req.headers, billingResult}
		res.end(JSON.stringify(data));
		return
	} else if (vipUrls.has(url)) {
		let apiKey = req.headers['customer-key'];
		console.log(`api key ${apiKey}`)
		const addr = decodeApiKey(app, apiKey.toString(), true)
		const vipInfo = await getVipInfo(addr)

		res.writeHead(200);
		const data = {code: 0, headers: req.headers, address: addr, vipInfo}
		res.end(JSON.stringify(data));
		return
	}

	res.writeHead(200);
	const data = {code: 0, message: 'Hello, World!', headers: req.headers}
	res.end(JSON.stringify(data));
}
async function main() {
	// await billing(app!, "/test-path", {seed: "0x0979193d54bf5cd4d4958944c52ac66deede4f2a_1658298895942",
	// 	sig: "0x5a6e7d63a320c565482dbe8c6b8afae63cbc3734ffa185536f209dfa8fa52f24608ce47f291f3285e8dc05230a31c70dd26422accbc2a723c4328e1510d72d6d1c"});
	const key = await buildBillingKey(app!, pk);
	console.log(`using billing key`, key)
	initWeb3payClient(RPC_BILLING, key, 1000)
	await initWeb3payVipClient(RPC_ENDPOINT, app);
	await serve();
}
async function serve() {
	const server = http.createServer(requestListener);
	console.log(`provider port is ${port}, base58`)
	console.log(`app [${app}]`)
	await accountInfo(pk!, RPC_ENDPOINT!)
	server.listen(port);
}

if (module == require.main) {
	main().then()
}