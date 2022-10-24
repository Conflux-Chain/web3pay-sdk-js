import {HttpClient} from "typed-rest-client/HttpClient"
import {BigNumber, Contract, ethers, Wallet} from "ethers";
import {attach, waitTx} from "./lib";
import {parseEther} from "ethers/lib/utils";

const web3pay : {
    templateContract: Contract;
    trackerContract: Contract;
    cardShopContract: Contract;
    client?: HttpClient, billingUrl: string, billingApiKey: string, rpcProvider?:any, appContract?:Contract} = {
    cardShopContract: undefined, templateContract: undefined, trackerContract: undefined,
    client: null, billingUrl: "",
    billingApiKey: "",
    // vip
    rpcProvider: null,
    appContract: null
}
export function getWeb3pay() {
    return web3pay;
}
export async function initWeb3payVipClient(rpcUrl:string, app:string, exitWhenFail = true) {
    const rpcProvider = ethers.getDefaultProvider(rpcUrl);
    web3pay.rpcProvider = rpcProvider;
    try {
        const {chainId} = await rpcProvider.getNetwork()
        console.log(`initWeb3payVipClient, chainId ${chainId}`)
    } catch (e) {
        console.log(`initWeb3payVipClient, check rpc provider fail.`, e)
        if (exitWhenFail) {
            process.exit(9)
        }
        return;
    }
    const {abi: appAbi} = require("./abi/App.json");
    web3pay.appContract = new ethers.Contract(app, appAbi, rpcProvider);

    const {abi: shopAbi} = require("./abi/CardShop.json");
    const cardShopAddr = await web3pay.appContract.cardShop();
    web3pay.cardShopContract = new ethers.Contract(cardShopAddr, shopAbi, rpcProvider);

    let trackerAddr = await web3pay.cardShopContract.tracker();
    const {abi: trackerAbi} = require("./abi/CardTracker.json");
    web3pay.trackerContract = new ethers.Contract(trackerAddr, trackerAbi, rpcProvider);

    const {abi: templateAbi} = require("./abi/CardTemplate.json");
    let templateAddr = await web3pay.cardShopContract.template();
    web3pay.templateContract = new ethers.Contract(templateAddr, templateAbi, rpcProvider);
    await updateVipInfoCache()
    //
    try {
        // const templates = await web3pay.templateContract.list(0, 100)
        const vipInfo = await web3pay.trackerContract.getVipInfo(app);
        const {expireAt, props: [[k0],[v0]]} = vipInfo
        console.log(`initWeb3payVipClient, check contract availability, vip info [expireAt ${expireAt}, props key ${k0} value ${v0}], ok`)
        const formattedVipInfo = await getVipInfo(app);
        console.log(`formattedVipInfo`, formattedVipInfo)
        //
        // await buyVipCard(1);
    } catch (e) {
        console.log(`initWeb3payVipClient, check contract fail:`, e)
        exitWhenFail && process.exit(0)
    }
}
async function getAsset(appX: Contract) {
    const asset = await appX.getAppCoin().then(appCoin => attach("AppCoinV2", appCoin, appX.provider)).then(ap => ap.asset());
    return asset;
}
export async function getExchanger() {
    const registryAddr = await web3pay.appContract.appRegistry();
    console.log(`registryAddr ${registryAddr}`)
    const registryContract = await attach("AppRegistry", registryAddr, web3pay.rpcProvider)
    return registryContract.getExchanger();
}
export async function buyVipCard(wallet: Wallet, count0: number = 0) {
    const [list, total] = await web3pay.templateContract.list(0, 100);
    if (total < 1) {
        console.log(`no card template found`);
        return;
    }
    const last = list.slice(-1)[0]
    const {price, duration, name, id} = last
    console.log(`last card template ${name}, price ${price}, duration ${duration}, id or object is `, id?.toNumber() || last)
    const asset = await getAsset(web3pay.appContract);
    console.log(`asset is ${asset}`)
    const exchangeAddr = await getExchanger();
    console.log(`exchangeAddr ${exchangeAddr}`)
    const exchangeContract = await attach("SwapExchange", exchangeAddr, wallet);
    const count = count0 || ( duration > 600 ? 1 : Math.ceil(600/ duration)) // 10 minutes at least
    let payEth = (BigInt(price) * BigInt(count)).toString();
    const ethIn = await exchangeContract.previewDepositETH(payEth);
    const shopWithWallet = web3pay.cardShopContract.connect(wallet);
    await shopWithWallet.buyWithEth(wallet.address, id, count, {value: ethIn}).then(waitTx);
    const vipInf = await getVipInfo(wallet.address);
    console.log(`vip info updated, expire at ${vipInf.expireAt} / ${new Date(vipInf.expireAt * 1000).toISOString()}`)
}
async function updateVipInfoCache(delay = 10_000) {
    try {
        for (const account of Object.keys(vipInfoCache)) {
            await getVipInfo(account, false)
        }
    } catch (e) {
        console.log(`updateVipInfoCache error:`, e)
    }
    setTimeout(()=>updateVipInfoCache(delay), delay)
}
const vipInfoCache = {}
export async function getVipInfo(account: string, useCache = true) : Promise<{expireAt: number;
    props: { keys: string[]; values: string[]}}> {
    let cache = useCache ? vipInfoCache[account] : undefined;
    if (cache) {
        return cache;
    }
    if (!web3pay.trackerContract) {
        console.log(`web3pay vip client not init`)
        return {expireAt: 0, props: {keys: [], values: []}}
    }
    return web3pay.trackerContract.getVipInfo(account).then(res=>{
        const {expireAt, props: [keys,values]} = res
        return {expireAt: expireAt.toNumber(), keys, values}
    }).then(res=>{
        vipInfoCache[account] = res;
        return res;
    });
}
export function initWeb3payClient(billingUrl: string, billingApiKey: string, timeout: number = 1000, userAgent:string = "web3pay client") {
    web3pay.client = new HttpClient(userAgent,
        undefined, {socketTimeout: timeout}
        );
    web3pay.billingUrl = billingUrl;
    web3pay.billingApiKey = billingApiKey;
}

// ref error code: https://github.com/Conflux-Chain/web3pay-service/blob/main/model/error.go
// request billing service
export async function billing(path: string, dryRun:boolean, consumerKey) {
    const headers = {
        "Content-Type": "application/json",
        "Billing-Key": web3pay.billingApiKey,
        "Api-Key": consumerKey,
    }
    const data = {
        resourceId: path,
        dryRun
    }
    const billingResult = await web3pay.client.post(`${web3pay.billingUrl}`,
        JSON.stringify(data),
        headers)
        .then(res=>res.readBody())
        .then(res=>{
            try {
                return JSON.parse(res)
            } catch (e) {
                console.log(`invalid response.`, res, e)
                console.log(`request info, data`, data, ` headers`, headers)
            }
            return {code: 500, billingText: res, message:`billing server returns invalid content.`}
        })
    // console.log(`billing result is`, billingResult)
    return billingResult
}
async function test() {
    let [,,rpc,app] = process.argv
    await initWeb3payVipClient(rpc, app, );
}
if (module === require.main) {
    test().then()
}