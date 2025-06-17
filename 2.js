/******************************************
 * @name TF 自动抓取参数 + 循环打开 join
 * @version 1.1.0
 ******************************************/

const $ = new Env("TestFlight自动加入");

$.isRequest = () => typeof $request !== "undefined";

if ($.isRequest()) {
  getParams();
  $.done();
} else {
  main();
}

// 抓参数逻辑（request 时触发）
function getParams() {
  const { url, headers: header } = $request;

  // 捕捉 TF 参数
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

// 非 request 时，执行自动 Join 逻辑
async function main() {
  const Key = $.getdata("tf_key");
  const requiredKeys = [
    "tf_session_id",
    "tf_session_digest",
    "tf_request_id",
    "tf_apple_store_front",
    "tf_apple_ta_device",
    "tf_apple_amd_m",
    "tf_apple_device_model",
    "tf_user_agent",
  ];

  const missing = requiredKeys.filter((k) => !$.getdata(k));
  if (!Key || missing.length) {
    $.msg($.name, "❌ 缺少 TF 参数", `缺失项: ${missing.join(", ")}`);
    return $.done();
  }

  const url = "https://testflight.apple.com/join/dDtSst46";  // ← 替换为你要 join 的链接
  const loop = parseInt($.getdata("tf_loon_count")) || 3;
  const delay = parseInt($.getdata("tf_interval")) || 2;

  for (let i = 0; i < loop; i++) {
    $.log(`📤 正在打开 TF 加入页面，第 ${i + 1} 次`);
    await httpGet(url, {
      "User-Agent": $.getdata("tf_user_agent"),
    });
    await sleep(delay * 1000);
  }

  $.msg($.name, "✅ 加入流程已完成", `链接: ${url}`);
  $.done();
}

function httpGet(url, headers) {
  return new Promise((resolve) => {
    $.get({ url, headers }, (err, resp, data) => resolve(data));
  });
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Env 类（适配多平台）
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
    if (typeof $notification !== "undefined")
      return $notification.post(title, subtitle, body);
  };
  this.log = console.log.bind(console);
  this.get = (opts, cb) => {
    if (typeof $task !== "undefined")
      return $task.fetch(opts).then((r) => cb(null, r, r.body), (e) => cb(e));
    if (typeof $httpClient !== "undefined")
      return $httpClient.get(opts, (e, r, d) => cb(e, r, d));
  };
  this.done = () => {
    if (typeof $done !== "undefined") $done();
  };
}