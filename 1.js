/******************************************
 * @name TestFlight监控自动加入
 * @description 保留原脚本所有功能，仅去除无效 ID 删除
 ******************************************/
const $ = new Env("TestFlight自动加入");
$.isRequest = () => typeof $request !== "undefined";

const [
  Key, SessionId, SessionDigest, RequestId, AppleStoreFront,
  AppleTaDevice, AppleAMDM, AppleDeviceModel, UserAgent,
  APP_ID_Str, LOON_COUNT = 1, INTERVAL = 0,
] = [
  "tf_key", "tf_session_id", "tf_session_digest", "tf_request_id",
  "tf_apple_store_front", "tf_apple_ta_device", "tf_apple_amd_m",
  "tf_apple_device_model", "tf_user_agent", "tf_app_ids",
  "tf_loon_count", "tf_interval",
].map(k => $.getdata(k));

let APP_IDS = APP_ID_Str ? APP_ID_Str.split(",") : [];

const inArray = (v, arr = APP_IDS) => arr.findIndex(i => i.split("#")[0] === v);

const getParams = () => {
  const { url, headers: hd } = $request;
  if (/\/v3\/accounts\/.*\/apps$/.test(url)) {
    const h = Object.fromEntries(Object.entries(hd).map(([k,v]) => [k.toLowerCase(), v]));
    ["session-id","session-digest","request-id","apple-store-front","apple-ta-device","apple-amd-m","apple-device-model","user-agent"].forEach(k => $.setdata(h[k], `tf_${k.replace(/-/g,"_")}`));
    const key = /\/accounts\/(.*?)\/apps/.exec(url)?.[1];
    $.setdata(key, "tf_key");
    $.msg($.name, "TF参数获取成功", `当前账户: ${key.slice(0,4)}****`);
  } else if (/\/join\/\w+$/.test(url) || /v3\/accounts\/.*\/ru/.test(url)) {
    const id = (/join\/(\w+)$/.exec(url) || /ru\/(\w+)$/.exec(url))[1];
    const item = `${id}#0`;
    if (!APP_IDS.includes(item)) {
      APP_IDS.push(item);
      $.setdata(APP_IDS.join(","), "tf_app_ids");
      $.msg($.name, "新 TF 应用捕获", id);
    } else $.msg($.name, "", `应用 ${id} 已存在。`);
  }
};

const TF_Check = app_id => new Promise((res, rej) => {
  const url = `https://testflight.apple.com/v3/accounts/${Key}/ru/${app_id}`;
  const hdr = { ...{ "content-type": "application/json" }, 
    "x-session-id": SessionId, "x-session-digest": SessionDigest,
    "x-request-id": RequestId, "x-apple-store-front": AppleStoreFront,
    "x-apple-ta-device": AppleTaDevice, "x-apple-amd-m": AppleAMDM,
    "x-apple-device-model": AppleDeviceModel, "user-agent": UserAgent
  };
  $.get({ url, headers: hdr }, (e, r, d) => {
    if (e) return rej(e);
    if (r.status !== 200) return rej("非200状态");
    const j = $.toObj(d);
    j ? res(j) : rej("无效返回");
  });
});

const TF_Join = app_id => new Promise((res, rej) => {
  const url = `https://testflight.apple.com/v3/accounts/${Key}/ru/${app_id}/accept`;
  const hdr = { "content-type": "application/json", "x-session-id": SessionId,
    "x-session-digest": SessionDigest, "x-request-id": RequestId,
    "x-apple-store-front": AppleStoreFront, "x-apple-ta-device": AppleTaDevice,
    "x-apple-amd-m": AppleAMDM, "x-apple-device-model": AppleDeviceModel,
    "user-agent": UserAgent
  };
  $.post({ url, headers: hdr }, (e, r, d) => e || r.status !== 200 ? rej(e || r.status) : res($.toObj(d)));
});

(async () => {
  if ($.isRequest()) return getParams();
  if (!Key || !SessionId || !SessionDigest || !RequestId || !AppleStoreFront || !AppleTaDevice || !AppleAMDM || !AppleDeviceModel || !UserAgent)
    return $.msg($.name, "缺少参数", "请先抓取 TF 参数");
  if (!APP_IDS.length)
    return $.msg($.name, "无 TF 链接", "请先打开 join 链接以捕获 app_id");

  const pending = APP_IDS.some(i => i.split("#")[1] === "0");
  if (!pending) return $.log("无待加入的应用");

  for (let item of APP_IDS) {
    const [appId, status] = item.split("#");
    if (status !== "0") {
      $.log(`${appId} 已加入，跳过`);
      continue;
    }
    for (let i = 0; i < (parseInt(LOON_COUNT) || 1); i++) {
      if (INTERVAL) await $.wait(parseInt(INTERVAL) * 1000);
      try {
        const resp = await TF_Check(appId);
        const s = resp.data.status;
        if (s === "OPEN") {
          const join = await TF_Join(appId);
          $.log("加入成功", resp.data.app.name);
          $.msg(resp.data.app.name, "TestFlight加入成功");
          APP_IDS[APP_IDS.indexOf(item)] = `${appId}#1`;
          $.setdata(APP_IDS.join(","), "tf_app_ids");
          break;
        } else if (s === "INVALID") {
          $.log(`${appId} 无效或不存在`, "⚠️ 保留待复用");
          // ❌ 删除逻辑已移除
        } else {
          $.log(appId, resp.data.message);
        }
      } catch (err) {
        $.log(appId, err);
        break;
      }
    }
    $.log("------- 完成", appId);
  }
})()
.catch(e => $.log("❗️出错", e))
.finally(() => $.done());