/******************************************
 * @name TF 自动抓取参数 + 正式加入 TF 应用
 * @version 1.1.1
 ******************************************/

const $ = new Env("TestFlight自动加入");

$.isRequest = () => typeof $request !== "undefined";

if ($.isRequest()) {
  getParams();
  $.done();
} else {
  main();
}

// 抓参数逻辑
function getParams() {
  const { url, headers: header } = $request;
  if (/^https:\/\/testflight\.apple\.com\/v3\/accounts\/.*\/apps$/.test(url)) {
    const h = {};
    Object.entries(header).forEach(([k, v]) => (h[k.toLowerCase()] = v));
    const key = /\/accounts\/(.*?)\/apps/.exec(url)?.[1] || null;

    $.setdata(h["x-session-id"], "tf_session_id");
    $.setdata(h["x-session-digest"], "tf_session_digest");
    $.setdata(h["x-request-id"], "tf_request_id");
    $.setdata(h["x-apple-store-front"], "tf_apple_store_front");
    $.setdata(h["x-apple-ta-device"], "tf_apple_ta_device");
    $.setdata(h["x-apple-amd-m"], "tf_apple_amd_m");
    $.setdata(h["x-apple-device-model"], "tf_apple_device_model");
    $.setdata(h["user-agent"], "tf_user_agent");
    $.setdata(key, "tf_key");

    const encrypt = (str) => str.slice(0, 4) + "***********";
    const msg = [
      `SessionId: ${encrypt(h["x-session-id"])}`,
      `SessionDigest: ${encrypt(h["x-session-digest"])}`,
      `RequestId: ${encrypt(h["x-request-id"])}`,
      `AppleStoreFront: ${h["x-apple-store-front"]}`,
      `AppleTaDevice: ${h["x-apple-ta-device"]}`,
      `AppleAMDM: ${h["x-apple-amd-m"]}`,
      `AppleDeviceModel: ${h["x-apple-device-model"]}`,
      `UserAgent: ${h["user-agent"]}`,
      `Key: ${encrypt(key)}`,
    ];
    console.log(msg.join("\n"));
    $.msg($.name, "✅ TF参数获取成功", `已保存 Key: ${encrypt(key)}`);
  }
}

// 加入 TF 应用主逻辑
async function main() {
  const Key = $.getdata("tf_key");
  const SessionId = $.getdata("tf_session_id");
  const SessionDigest = $.getdata("tf_session_digest");
  const RequestId = $.getdata("tf_request_id");
  const AppleStoreFront = $.getdata("tf_apple_store_front");
  const AppleTaDevice = $.getdata("tf_apple_ta_device");
  const AppleAMDM = $.getdata("tf_apple_amd_m");
  const AppleDeviceModel = $.getdata("tf_apple_device_model");
  const UserAgent = $.getdata("tf_user_agent");

  const required = [Key, SessionId, SessionDigest, RequestId, AppleStoreFront, AppleTaDevice, AppleAMDM, AppleDeviceModel, UserAgent];
  if (required.some((x) => !x)) {
    $.msg($.name, "❌ 缺少 TF 参数", "请先手动打开 TF App 获取参数");
    return $.done();
  }

  const appId = "dDtSst46"; // ← 替换为你的 App ID
  const loop = parseInt($.getdata("tf_loon_count")) || 3;
  const delay = parseInt($.getdata("tf_interval")) || 2;

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

  for (let i = 0; i < loop; i++) {
    $.log(`📥 第 ${i + 1} 次尝试加入 ${appId}`);
    try {
      const result = await TF_Join(appId, baseURL, headers);
      if (result.data?.status === "FULL") {
        $.msg($.name, `⚠️ 第 ${i + 1} 次加入结果`, `队列已满（FULL）`);
      } else {
        $.msg($.name, `✅ 第 ${i + 1} 次加入成功`, `状态: ${result.data?.status || "未知"}`);
      }
    } catch (e) {
      $.log(`❌ 加入失败: ${e}`);
    }
    await sleep(delay * 1000);
  }

  $.done();
}

// 真正的加入接口
function TF_Join(app_id, baseURL, headers) {
  return new Promise((resolve, reject) => {
    $.post(
      {
        url: baseURL + app_id + "/accept",
        headers,
      },
      (error, response, data) => {
        if (!error && response.status === 200) {
          const json = $.toObj(data);
          if (!json) {
            return reject("返回 JSON 解析失败");
          }
          resolve(json);
        } else {
          reject(error || `状态码 ${response.status}`);
        }
      }
    );
  });
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Env 类
function Env(name) {
  this.name = name;
  this.getdata = (key) =>
    typeof $prefs !== "undefined"
      ? $prefs.valueForKey(key)
      : typeof $persistentStore !== "undefined"
      ? $persistentStore.read(key)
      : null;
  this.setdata = (val, key) =>
    typeof $prefs !== "undefined"
      ? $prefs.setValueForKey(val, key)
      : typeof $persistentStore !== "undefined"
      ? $persistentStore.write(val, key)
      : false;
  this.msg = (title, subtitle, body) => {
    if (typeof $notify !== "undefined") return $notify(title, subtitle, body);
    if (typeof $notification !== "undefined") return $notification.post(title, subtitle, body);
  };
  this.log = console.log.bind(console);
  this.get = (opts, cb) => {
    if (typeof $task !== "undefined")
      return $task.fetch(opts).then((r) => cb(null, r, r.body), (e) => cb(e));
    if (typeof $httpClient !== "undefined")
      return $httpClient.get(opts, (e, r, d) => cb(e, r, d));
  };
  this.post = (opts, cb) => {
    if (typeof $task !== "undefined")
      return $task.fetch({ ...opts, method: "POST" }).then((r) => cb(null, r, r.body), (e) => cb(e));
    if (typeof $httpClient !== "undefined")
      return $httpClient.post(opts, (e, r, d) => cb(e, r, d));
  };
  this.toObj = (str) => {
    try {
      return JSON.parse(str);
    } catch {
      return null;
    }
  };
  this.done = () => {
    if (typeof $done !== "undefined") $done();
  };
}