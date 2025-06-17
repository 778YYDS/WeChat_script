/******************************************
 * @name TestFlight 自动抓取 + 加入（容错版）
 * @version 1.1.1
 ******************************************/
const $ = new Env("TestFlight 自动加入");
$.isRequest = () => typeof $request !== "undefined";

const STORE = {
  key: "tf_key",
  sessionId: "tf_session_id",
  sessionDigest: "tf_session_digest",
  requestId: "tf_request_id",
  appleStoreFront: "tf_apple_store_front",
  appleTaDevice: "tf_apple_ta_device",
  appleAMDM: "tf_apple_amd_m",
  appleDeviceModel: "tf_apple_device_model",
  userAgent: "tf_user_agent",
  appIds: "tf_app_ids",
};

function getStored(k) {
  return $.getdata(STORE[k]);
}

function setStored(k, v) {
  return $.setdata(v, STORE[k]);
}

function saveAppId(appId) {
  const raw = getStored("appIds") || "";
  const arr = raw ? raw.split(",") : [];
  const entry = `${appId}#0`;
  if (!arr.includes(entry)) {
    arr.push(entry);
    setStored("appIds", arr.join(","));
    $.msg($.name, "捕获 APP_ID ✅", appId);
  } else {
    $.log(`应用ID: ${appId} 已存在，无需重复添加。`);
  }
}

if ($.isRequest()) {
  const { url, headers } = $request;

  // 抓取 TestFlight 参数
  if (/\/v3\/accounts\/.*\/apps/.test(url)) {
    const h = {};
    Object.entries(headers).forEach(([k, v]) => h[k.toLowerCase()] = v);
    const id = /\/accounts\/(.*?)\/apps/.exec(url)[1];
    setStored("sessionId", h["x-session-id"]);
    setStored("sessionDigest", h["x-session-digest"]);
    setStored("requestId", h["x-request-id"]);
    setStored("appleStoreFront", h["x-apple-store-front"]);
    setStored("appleTaDevice", h["x-apple-ta-device"]);
    setStored("appleAMDM", h["x-apple-amd-m"]);
    setStored("appleDeviceModel", h["x-apple-device-model"]);
    setStored("userAgent", h["user-agent"]);
    setStored("key", id);
    $.msg($.name, "TF 参数已保存", `Key: ${id.slice(0,4)}…`);
  }
  // 抓取 join 的 App ID
  else if (/\/join\/([A-Za-z0-9]+)$/.test(url)) {
    const m = url.match(/\/join\/([A-Za-z0-9]+)$/);
    if (m) saveAppId(m[1]);
  }
  $.done();
} else {
  // 自动加入逻辑
  const Key = getStored("key"),
        SessionId = getStored("sessionId"),
        SessionDigest = getStored("sessionDigest"),
        RequestId = getStored("requestId"),
        AppleStoreFront = getStored("appleStoreFront"),
        AppleTaDevice = getStored("appleTaDevice"),
        AppleAMDM = getStored("appleAMDM"),
        AppleDeviceModel = getStored("appleDeviceModel"),
        UserAgent = getStored("userAgent");

  let APP_IDS = [];
  const raw = getStored("appIds") || "";
  if (raw) {
    APP_IDS = raw.split(",").filter(x => x);
  }

  if (!Key || !SessionId || !SessionDigest || !RequestId ||
      !AppleStoreFront || !AppleTaDevice || !AppleAMDM ||
      !AppleDeviceModel || !UserAgent || APP_IDS.length === 0) {
    $.msg($.name, "❌ 参数缺失", "请先访问 TF 获取参数与 APP_ID，再重试");
    $.done();
  }

  const baseURL = `https://testflight.apple.com/v3/accounts/${Key}/ru/`;
  const headers = {
    "content-type": "application/json",
    "x-session-id": SessionId,
    "x-session-digest": SessionDigest,
    "x-request-id": RequestId,
    "x-apple-store-front": AppleStoreFront,
    "x-apple-ta-device": AppleTaDevice,
    "x-apple-amd-m": AppleAMDM,
    "x-apple-device-model": AppleDeviceModel,
    "user-agent": UserAgent,
  };

  const TF_Check = app_id => new Promise((res, rej) => {
    $.get({url: baseURL + app_id, headers}, (e, r, d) => {
      if (e || r.status !== 200) return rej(e || r.status);
      const o = $.toObj(d);
      if (!o || !o.data) return rej("数据解析失败");
      res(o);
    });
  });

  const TF_Join = app_id => new Promise((res, rej) => {
    $.post({url: baseURL + app_id + "/accept", headers}, (e, r, d) => {
      if (e || r.status !== 200) return rej(e || r.status);
      const o = $.toObj(d);
      if (!o || !o.data) return rej("响应解析失败");
      res(o);
    });
  });

  (async () => {
    for (let i = 0; i < APP_IDS.length; i++) {
      const [appId, status] = APP_IDS[i].split("#");
      if (status === "1") continue;

      try {
        const info = await TF_Check(appId);
        if (info.data.status === "OPEN") {
          $.log(`👉 ${appId} 开放中，尝试加入…`);
          const res = await TF_Join(appId);
          APP_IDS[i] = `${appId}#1`;
          setStored("appIds", APP_IDS.join(","));
          $.msg("🎉 加入成功", res.data.name);
        } else {
          $.log(`${appId} 当前状态：${info.data.message || info.data.status}`);
        }
      } catch (err) {
        $.log(`❗ ${appId} 操作失败：${err}`);
      }
    }
    $.done();
  })();
}

// ------------- Env 类省略，与前版一致 -------------