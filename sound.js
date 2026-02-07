window.api.onPlaySound((soundUrl) => {
  console.log("🔊 Playing sound URL:", soundUrl);

  const audio = document.getElementById("player");
  audio.src = soundUrl;
  audio.volume = 1.0;

  audio.oncanplaythrough = () => {
    console.log("🔊 Audio loaded, playing");
    audio.play().catch((err) => console.error("❌ Audio play failed:", err));
  };

  audio.onerror = (e) => {
    console.error("❌ Audio element error", e);
  };
});
