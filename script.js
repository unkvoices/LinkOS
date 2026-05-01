let appName = document.querySelector(".app_name");










function generateQR() {
  const text = document.getElementById("text").value;
  const qrContainer = document.getElementById("qrcode");
  qrContainer.innerHTML = "";

  new QRCode(qrContainer, {
    text: text,
    width: 200,
    height: 200
  });
}
 