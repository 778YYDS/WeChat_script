/******************************************
 * @name TF 参数抓取 + 循环打开 join
 * @version 1.0.0
 ******************************************/

const $ = new Env("TF 自动打开 Join");

const TF_JOIN_URL = "https://testflight.apple.com/join/dDtSst46";  // ← 在这里替换为你的 join 链接

$.isRequest = () => typeof $request !== "undefined";

if ($.isRequest()) {
  const { url, headers } = $request;
  if (/\/v3\/accounts\/.*\/apps/.test(url)) {
    const h = {};
    Object.entries(headers).forEach(([k, v]) => h[k.toLowerCase()] = v);
    const id = /\/accounts\/(.*?)\/apps/.exec(url)[1];
    ["x-session-id","x-session-digest","x-request-id","x-apple-store-front",
     "x-apple-ta-device","x-apple-amd-m","x-apple-device-model","user-agent"]
      .forEach(k => $.setdata(h[k], k));
    $.setdata(id, "tf_key");
    $.msg($.name, "✅ TF 参数已保存", `Key: ${id.slice(0,4)}…`);
  }
  $.done();
} else {
  const Key = $.getdata("tf_key");
  const needed = ["x-session-id","x-session-digest","x-request-id",
    "x-apple-store-front","x-apple-ta-device","x-apple-amd-m",
    "x-apple-device-model","user-agent"].every(k => $.getdata(k));
  if (!Key || !needed) {
    $.msg($.name, "❌ 缺少 TF 参数", "请触发 TF 应用页面以保存参数");
    return $.done();
  }

  // 循环打开 join 页面
  (async () => {
    for (let i = 0; i < 3; i++) {  // 可修改循环次数
      $.log(`📤 正在打开：${TF_JOIN_URL}（第 ${i+1} 次）`);
      await $.get({ url: TF_JOIN_URL, headers: { "User-Agent": $.getdata("user-agent") } });
      await new Promise(r => setTimeout(r, 2000));  // 等待2秒，可调整
    }
    $.msg($.name, "✅ 完成循环打开", TF_JOIN_URL);
    $.done();
  })();
}

// ====== Env 类（省略，保持与平台一致） ======