/*
TestFlight 自动加入脚本 (适用于 Quantumult X)
配置说明:
- 在 BoxJS 中设置 KEY 为 APP_ID, value 为要加入的 TestFlight APP ID，多个 ID 用英文逗号分隔。
*/
const $ = new Env("TestFlight自动加入");

!(async () => {
  // 从 BoxJS 读取配置的 APP_ID
  let appIds = $.read("APP_ID");
  if (!appIds) {
    $.msg($.name, "", "请先在 BoxJS 中配置 APP_ID!");
    $.done();
    return;
  }
  // 支持多个 ID
  let ids = appIds.split(",");
  for (let id of ids) {
    id = id.trim();
    if (!id) continue;
    await TF_Join(id);
  }
})()
  .catch((e) => {
    $.logErr(e);
  })
  .finally(() => {
    $.done();
  });

function TF_Join(appId) {
  return new Promise((resolve) => {
    let url = `https://testflight.apple.com/join/${appId}`;
    // 构造请求，根据实际需要可添加 Headers 或 Body
    let options = {
      url: url,
      headers: {
        "Content-Type": "application/json"
        // 根据需要添加其他 Headers，例如 Apple 会话信息
      },
      body: JSON.stringify({
        // 请求体根据实际 API 要求配置
        destination: "join-test-flights",
        publicLink: url
      })
    };
    $.post(options, (error, response, data) => {
      let status;
      if (response) {
        status = typeof response.statusCode !== "undefined" ? response.statusCode : response.status;
      }
      if (status === 200) {
        $.msg($.name, `加入成功 - ${appId}`, "");
      } else {
        $.msg($.name, `加入失败 - ${appId}`, `HTTP 状态: ${status}`);
      }
      resolve();
    });
  });
}