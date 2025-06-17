/******************************************
 * @name TestFlight 自动加入（手动输入版）
 * @version 1.2.0
 ******************************************/
const $ = new Env("TestFlight 自动加入");
$.isRequest = () => typeof $request !== "undefined";

// ⚙️ 手动填写你要加入的 TestFlight App IDs：
const APP_IDS = [
  "dDtSst46",
  // "另一个AppID",
];

// ======= 抓取参数，自动运行时不用理会 =======
if ($.isRequest()) {
  const { url, headers } = $request;
  if (/\/v3\/accounts\/.*\/apps/.test(url)) {
    const h = {};
    Object.entries(headers).forEach(([k, v]) => h[k.toLowerCase()] = v);
    const id = /\/accounts\/(.*?)\/apps/.exec(url)[1];
    ["x-session-id","x-session-digest","x-request-id","x-apple-store-front",
     "x-apple-ta-device","x-apple-amd-m","x-apple-device-model","user-agent"]
      .forEach(k => $.setdata(h[k], k.replace(/-/g, "_")));
    $.setdata(id, "tf_key");
    $.msg($.name, "✅ TF 参数已保存", `Key: ${id.slice(0,4)}…`);
  }
  if (/\/join\/([A-Za-z0-9]+)$/.test(url)) {
    const m = url.match(/\/join\/([A-Za-z0-9]+)$/);
    m && $.msg($.name, "捕获 App ID", m[1]);
  }
  $.done();
} else {
  // ======= 正式使用逻辑 =======
  const kv = k => $.getdata(k.replace(/-/g,"_"));
  const Key = kv("tf_key"),
        SessionId = kv("x-session-id"),
        SessionDigest = kv("x-session-digest"),
        RequestId = kv("x-request-id"),
        AppleStoreFront = kv("x-apple-store-front"),
        AppleTaDevice = kv("x-apple-ta-device"),
        AppleAMDM = kv("x-apple-amd-m"),
        AppleDeviceModel = kv("x-apple-device-model"),
        UserAgent = kv("user-agent");

  if (![Key,SessionId,SessionDigest,RequestId,AppleStoreFront,
        AppleTaDevice,AppleAMDM,AppleDeviceModel,UserAgent].every(x=>x)) {
    $.msg($.name, "❗ 参数缺失", "请访问 TestFlight 应用列表页以获取参数");
    return $.done();
  }
  if (APP_IDS.length === 0) {
    $.msg($.name, "❗ 没有配置 App IDs", "请在脚本顶部填写 `APP_IDS` 数组");
    return $.done();
  }

  const baseURL = `https://testflight.apple.com/v3/accounts/${Key}/ru/`;
  const headers = {
    "Content-Type": "application/json",
    "x-session-id": SessionId,
    "x-session-digest": SessionDigest,
    "x-request-id": RequestId,
    "x-apple-store-front": AppleStoreFront,
    "x-apple-ta-device": AppleTaDevice,
    "x-apple-amd-m": AppleAMDM,
    "x-apple-device-model": AppleDeviceModel,
    "User-Agent": UserAgent,
  };

  const TF_Check = app_id => new Promise((res, rej) => {
    $.get({url: baseURL + app_id, headers}, (e,r,d)=>{
      if (e || r.status !== 200) return rej(e||r.status);
      const o = $.toObj(d);
      o && o.data ? res(o) : rej("解析失败");
    });
  });
  const TF_Join = app_id => new Promise((res, rej) => {
    $.post({url: baseURL + app_id + "/accept", headers}, (e,r,d)=>{
      if (e || r.status !== 200) return rej(e||r.status);
      const o = $.toObj(d);
      o && o.data ? res(o) : rej("响应解析失败");
    });
  });

  (async () => {
    for (const appId of APP_IDS) {
      try {
        const info = await TF_Check(appId);
        if (info.data.status === "OPEN") {
          $.log(`👉 ${appId} 开放中，尝试加入…`);
          const res = await TF_Join(appId);
          $.msg("🎉 加入成功", `${res.data.name}`);
        } else {
          $.log(`${appId} 状态：${info.data.message || info.data.status}`);
        }
      } catch (err) {
        $.log(`❗ ${appId} 操作失败：${err}`);
      }
    }
    $.done();
  })();
}

// ==== Env 类请使用你设备上当前版本 ====