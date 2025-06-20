/******************************************
 * @name TF 自动抓取参数 + 单次加入（状态码判断）
 * @version 1.3.3
 ******************************************/

const $ = new Env("TestFlight自动加入");

$.isRequest = () => typeof $request !== "undefined";

if ($.isRequest()) {
  getParams();
  $.done();
} else {
  main();
}

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

    const encrypt = (str) => str ? str.slice(0, 4) + "***********" : "null";
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

async function main() {
  try {
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

    const appId = "dDtSst46"; // ← 修改为你要加入的 TF App ID
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

    $.log(`🔍 正在尝试加入 TF 项目 ${appId}...`);

    const result = await TF_Join(appId, baseURL, headers);

    const body = result?.body || "";
    const json = $.toObj(body);

    if (json?.data?.name) {
      const appName = json.data.name;
      const version = json.data.platforms?.[0]?.build?.cfBundleShortVersion || "未知版本";
      $.msg($.name, "✅ 加入成功", `${appName} - v${version}`);
      $.log(`✅ 成功加入 TF 项目：${appName}，版本：v${version}`);
    } else if (result.status === 401 || body.includes("401")) {
      $.msg($.name, "❌ 加入失败", `身份验证失败（401）`);
      $.log("❌ 加入失败：身份验证失败（401）");
    } else {
      $.msg($.name, "❌ 加入失败", `状态码: ${result.status || "undefined"}`);
      $.log(`❌ 加入失败，状态码: ${result.status || "undefined"}`);
      $.log(`响应内容: ${body}`);
    }
  } catch (e) {
    $.msg($.name, "❌ 脚本运行异常", String(e));
    $.log(`❌ 脚本执行错误: ${String(e)}`);
  } finally {
    $.done();
  }
}

function TF_Join(app_id, baseURL, headers) {
  return new Promise((resolve, reject) => {
    $.post(
      {
        url: baseURL + app_id + "/accept",
        headers,
      },
      (error, response, data) => {
        if (error) {
          reject(error);
        } else {
          resolve({ status: response?.status || response?.statusCode || "undefined", body: data });
        }
      }
    );
  });
}

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