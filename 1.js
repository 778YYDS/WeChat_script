const $ = (() => {
  const isQX = typeof $task !== "undefined";
  const isLoon = typeof $loon !== "undefined";
  const isSurge = typeof $httpClient !== "undefined" && typeof $loon === "undefined";
  const isNode = typeof require === "function" && !isQX && !isSurge;

  const notify = (title, subtitle, message) => {
    if (isQX) $notify(title, subtitle, message);
    if (isLoon || isSurge) $notification.post(title, subtitle, message);
    if (isNode) console.log(`${title}\n${subtitle}\n${message}`);
  };

  const read = (key) => {
    if (isQX) return $prefs.valueForKey(key);
    if (isLoon || isSurge) return $persistentStore.read(key);
    if (isNode) {
      const fs = require("fs");
      try {
        return fs.readFileSync(key, "utf8");
      } catch {
        return null;
      }
    }
  };

  const write = (value, key) => {
    if (isQX) return $prefs.setValueForKey(value, key);
    if (isLoon || isSurge) return $persistentStore.write(value, key);
    if (isNode) {
      const fs = require("fs");
      return fs.writeFileSync(key, value, "utf8");
    }
  };

  const get = (url, cb) => {
    if (isQX) {
      $task.fetch({ method: "GET", url }).then(
        (resp) => cb(null, {}, resp.body),
        (err) => cb(err)
      );
    }
    if (isLoon || isSurge) $httpClient.get(url, cb);
    if (isNode) {
      const axios = require("axios");
      axios.get(url).then((resp) => cb(null, {}, resp.data)).catch(cb);
    }
  };

  return { isQX, isLoon, isSurge, isNode, notify, read, write, get };
})();

const tfKey = "tf_app_ids";
let appIds = [];

const fetchAppIds = () => {
  const data = $.read(tfKey);
  if (!data) {
    console.log("未找到 TestFlight ID 列表，请设置 tf_app_ids");
    $.notify("TestFlight 加入器", "", "未设置 tf_app_ids，请先设置");
    return [];
  }
  try {
    return JSON.parse(data);
  } catch (err) {
    console.log("tf_app_ids JSON 解析失败: " + err);
    return [];
  }
};

const delay = (ms) => new Promise((res) => setTimeout(res, ms));

const processAppIds = async () => {
  appIds = fetchAppIds();
  if (appIds.length === 0) return;

  const joined = [];
  const full = [];
  const invalid = [];

  for (const app of appIds) {
    const { appId, name } = app;
    const url = `https://testflight.apple.com/join/${appId}`;
    console.log(`尝试加入：${name || "未知应用"}（${appId}）`);

    await new Promise((resolve) => {
      $.get(url, async (err, resp, body) => {
        if (err) {
          console.log(`请求出错: ${err}`);
          resolve();
          return;
        }

        const match = body.match(/window\.location\s*=\s*"([^"]+)"/);
        if (!match) {
          console.log(`未能匹配跳转链接，可能无效：${appId}`);
          invalid.push(appId); // 不再删除无效 ID，只记录
          resolve();
          return;
        }

        const redirect = match[1];
        console.log(`跳转链接: ${redirect}`);

        if (redirect.includes("/beta/accept")) {
          console.log(`✅ 成功加入 ${name || appId}`);
          joined.push(name || appId);
        } else if (redirect.includes("/beta/full")) {
          console.log(`❌ ${name || appId} 已满`);
          full.push(name || appId);
        } else {
          console.log(`⚠️ 未知状态: ${redirect}`);
        }

        await delay(1000); // 等待 1 秒，防止频率过高
        resolve();
      });
    });
  }

  if (joined.length > 0 || full.length > 0) {
    $.notify(
      "TestFlight 加入结果",
      joined.length > 0 ? `成功加入：${joined.join(", ")}` : "",
      full.length > 0 ? `已满：${full.join(", ")}` : ""
    );
  }

  // 不再移除无效 ID，保留 appIds 原状态
};

(async () => {
  await processAppIds();
})();