## Issue Description

**Problem:** When toggling AI Denoiser (enable/disable), the microphone device reverts to the default device instead of maintaining the user-selected device.

**Expected Behavior:** The microphone device should remain unchanged when toggling AI Denoiser.

**Actual Behavior:** The microphone device switches to the default device (usually "Built-in Microphone") when AI Denoiser is toggled.

## Setup Instructions

1. **Install dependencies:**

   ```bash
   npm install
   ```

2. **Start the application:**

   ```bash
   npm start
   ```

3. **Open browser:** Navigate to `http://localhost:3000`


https://github.com/user-attachments/assets/ff43df0b-c480-4d14-9d7c-72ddc17ed8c3

## UPDATE

### Cause

According to the Agora support team, this is expected behavior.
When the AI Denoiser is enabled, the SDK routes microphone audio through an internal processing node.
After the denoiser is disabled, that node is removed, and the SDK reconnects the track to the original raw microphone source.

Reply from Agora:
>“It is an expected behavior. This happens because when the AI Denoiser is enabled, the SDK routes your mic audio through an internal processing node that outputs the processed stream.
When you disable the denoiser, that processing node is removed, so the SDK automatically reconnects your LocalAudioTrack to the original raw microphone source.”

As a result, the microphone may temporarily revert to the default input device when disabling the denoiser.

### Solution

If you want to preserve the user-selected microphone after disabling the AI Denoiser,
you should manually reapply the stored deviceId or recreate the mic track using the same device.

Example approach (shared by Agora):
```js
const disableDenoiser = async () => {
  if (!processor || !micTrack) return;

  try {
    console.log("Disabling AI Denoiser...");

//store the currentDeviceId before disabling denoiser
    const currentDeviceId = micTrack
      .getMediaStreamTrack()
      .getSettings().deviceId;

//disable denoiser
    await processor.disable();

//create a new mictrack using the stored deviceId
    const newMicTrack = await AgoraRTC.createMicrophoneAudioTrack({
      microphoneId: currentDeviceId,
    });

    //Replace the old track with the new one
    await client.unpublish(micTrack);
    micTrack.close();
    micTrack = newMicTrack;
    await client.publish(micTrack);

    console.log("AI Denoiser disabled. Mic retained:", micTrack.getTrackLabel());
  } catch (err) {
    console.error("Failed to disable AI Denoiser:", err);
  }
};
```
