import { useState, useEffect, useRef } from "react";
import AgoraRTC from "agora-rtc-sdk-ng";
import { IMicrophoneAudioTrack } from "agora-rtc-sdk-ng";
import {
  AIDenoiserExtension,
  IAIDenoiserProcessor,
} from "agora-extension-ai-denoiser";

function App() {
  const [micTrack, setMicTrack] = useState<IMicrophoneAudioTrack | null>(null);
  const [processor, setProcessor] = useState<IAIDenoiserProcessor | null>(null);
  const [isDenoiserEnabled, setIsDenoiserEnabled] = useState(false);
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [currentDevice, setCurrentDevice] = useState<string>("");
  const [logs, setLogs] = useState<string[]>([]);
  const [isInitialized, setIsInitialized] = useState(false);
  const extensionRef = useRef<AIDenoiserExtension | null>(null);

  // Initialize extension only once
  if (!extensionRef.current) {
    extensionRef.current = new AIDenoiserExtension({
      assetsPath: "/external/",
    });
  }

  // Logging function
  const log = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    const logMessage = `[${timestamp}] ${message}`;
    setLogs((prev) => [...prev, logMessage]);
    console.log(logMessage);
  };

  // Initialize Agora
  const initializeAgora = async () => {
    try {
      log("Initializing Agora...");

      // Create microphone track
      const track = await AgoraRTC.createMicrophoneAudioTrack();
      setMicTrack(track);
      log(`✅ Microphone track created: ${track.getTrackLabel()}`);

      // Get available devices
      const deviceList = await AgoraRTC.getDevices();
      const micDevices = deviceList.filter((d) => d.kind === "audioinput");
      setDevices(micDevices);
      setCurrentDevice(track.getTrackLabel());

      log(`Found ${micDevices.length} microphone devices`);

      // Initialize AI Denoiser extension
      let proc;
      try {
        if (!extensionRef.current) {
          throw new Error("Extension not initialized");
        }
        AgoraRTC.registerExtensions([extensionRef.current]);
        proc = extensionRef.current.createProcessor();
        await proc.enable();
        setProcessor(proc);
        log("✅ AI Denoiser extension initialized");
      } catch (error) {
        log(
          `❌ AI Denoiser initialization failed: ${
            error instanceof Error ? error.message : "Unknown error"
          }`
        );
        throw error;
      }

      // Set up track-updated event listener
      track.on("track-updated", (updatedTrack) => {
        log(`track-updated event fired!`);
        log(`   - track.label: ${updatedTrack.label}`);
        log(`   - track.label: ${track.getTrackLabel()}`);
        setCurrentDevice(updatedTrack.label);
      });

      // Initial pipe
      track.pipe(proc).pipe(track.processorDestination);
      setIsDenoiserEnabled(true);

      setIsInitialized(true);
      log("Initialization complete");
    } catch (error) {
      log(
        `❌ Initialization failed: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  };

  // Enable AI Denoiser
  const enableDenoiser = async () => {
    if (!processor || !micTrack) return;

    try {
      log(`Enabling AI Denoiser...`);
      log(` Current device before enable: ${micTrack.getTrackLabel()}`);

      await processor.enable();
      setIsDenoiserEnabled(true);

      log(` Current device after enable: ${micTrack.getTrackLabel()}`);
      log("✅ AI Denoiser enabled");
    } catch (error) {
      log(
        `❌ Failed to enable AI Denoiser: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  };

  // Disable AI Denoiser
  const disableDenoiser = async () => {
    if (!processor || !micTrack) return;

    try {
      log(`Disabling AI Denoiser...`);
      log(`   Current device before disable: ${micTrack.getTrackLabel()}`);

      await processor.disable();
      setIsDenoiserEnabled(false);

      log(` Current device after disable: ${micTrack.getTrackLabel()}`);
      log("✅ AI Denoiser disabled");
    } catch (error) {
      log(
        `❌ Failed to disable AI Denoiser: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  };

  // Change device
  const changeDevice = async (deviceId: string) => {
    if (!micTrack) return;

    try {
      const device = devices.find((d) => d.deviceId === deviceId);
      if (!device) return;

      log(`Changing device to: ${device.label}`);
      log(` Current device before change: ${micTrack.getTrackLabel()}`);

      await micTrack.setDevice(deviceId);

      log(` Current device after change: ${micTrack.getTrackLabel()}`);
      log("✅ Device changed successfully");
    } catch (error) {
      log(
        `❌ Failed to change device: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (micTrack) {
        micTrack.close();
      }
    };
  }, [micTrack]);

  return (
    <div className="App">
      <div className="container">
        <h1>Agora AI Denoiser Device Bug Reproduction</h1>

        <div className="section">
          <h2>Issue Description</h2>
          <p>
            <strong>Problem:</strong> When toggling AI Denoiser
            (enable/disable), the microphone device reverts to the default
            device instead of maintaining the user-selected device.
          </p>
          <p>
            <strong>Expected Behavior:</strong> The microphone device should
            remain unchanged when toggling AI Denoiser.
          </p>
          <p>
            <strong>Actual Behavior:</strong> The microphone device switches to
            the default device (usually "Built-in Microphone") when AI Denoiser
            is toggled.
          </p>
        </div>

        <div className="section">
          <h2>Current Device Status</h2>
          <div className="device-info">
            <strong>Current Device:</strong>{" "}
            {currentDevice || "Not initialized"}
          </div>
          <div className="device-info">
            <strong>AI Denoiser Status:</strong>{" "}
            {isDenoiserEnabled ? "Enabled" : "Disabled"}
          </div>
        </div>

        <div className="section">
          <h2>AI Denoiser Controls</h2>
          <button onClick={initializeAgora} disabled={isInitialized}>
            Initialize Agora
          </button>
          <button
            onClick={enableDenoiser}
            disabled={!isInitialized || isDenoiserEnabled}
          >
            Enable AI Denoiser
          </button>
          <button
            onClick={disableDenoiser}
            disabled={!isInitialized || !isDenoiserEnabled}
          >
            Disable AI Denoiser
          </button>
        </div>

        <div className="section">
          <h2>Device Selection</h2>
          <div className="device-list">
            {devices.length === 0 ? (
              <p>Initialize Agora first to see available devices.</p>
            ) : (
              devices
                .filter((d) => d.kind === "audioinput")
                .map((device) => (
                  <button
                    key={device.deviceId}
                    className={`device-button ${
                      micTrack?.getTrackLabel() === device.label ? "active" : ""
                    }`}
                    onClick={() => changeDevice(device.deviceId)}
                  >
                    {device.label}
                  </button>
                ))
            )}
          </div>
        </div>

        <div className="section">
          <h2>Reproduction Steps</h2>
          <ol>
            <li>Click "Initialize Agora" button</li>
            <li>Select a specific microphone device (not the default one)</li>
            <li>Click "Disable AI Denoiser"</li>
            <li>
              <strong>BUG:</strong> Device reverts to default microphone
            </li>
          </ol>
        </div>

        <div className="section">
          <h2>Console Logs</h2>
          <div className="logs">
            {logs.map((log, index) => (
              <div key={index} className="log-entry">
                {log}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
