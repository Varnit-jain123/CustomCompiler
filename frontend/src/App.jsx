import React, { useState, useEffect, useCallback } from "react";
import "./App.css";
import Editor from "./components/Editor";
import Terminal from "./components/Terminal";
import Toolbar from "./components/Toolbar";
import Chatbot from "./components/Chatbot";
import SerialMonitor from "./components/SerialMonitor";
import { apiService } from "./services/api";
import websocketService from "./services/websocket";

// ---------- Default Blink Example ----------
const DEFAULT_CODE = `// Arduino Blink Example
void setup() {
  Serial.begin(9600);
  pinMode(LED_BUILTIN, OUTPUT);
}

void loop() {
  digitalWrite(LED_BUILTIN, HIGH);
  Serial.println("LED ON");
  delay(1000);
  digitalWrite(LED_BUILTIN, LOW);
  Serial.println("LED OFF");
  delay(1000);
}`;

// ---------- OTA Example for ESP32 ----------
const OTA_EXAMPLE_CODE = `// ESP32 OTA Example
#include <WiFi.h>
#include <ESPmDNS.h>
#include <WiFiUdp.h>
#include <ArduinoOTA.h>

const char* ssid = "YOUR_WIFI_SSID";
const char* password = "YOUR_WIFI_PASSWORD";

void setup() {
  Serial.begin(115200);
  Serial.println("Booting...");

  pinMode(LED_BUILTIN, OUTPUT);

  WiFi.mode(WIFI_STA);
  WiFi.begin(ssid, password);

  while (WiFi.waitForConnectResult() != WL_CONNECTED) {
    Serial.println("Connection Failed! Rebooting...");
    delay(5000);
    ESP.restart();
  }

  Serial.println("WiFi connected!");
  Serial.print("IP address: ");
  Serial.println(WiFi.localIP());

  ArduinoOTA.setHostname("esp32_device");

  ArduinoOTA.onStart([]() {
    String type = (ArduinoOTA.getCommand() == U_FLASH) ? "sketch" : "filesystem";
    Serial.println("Start updating " + type);
  });

  ArduinoOTA.onEnd([]() { Serial.println("\\nUpdate complete!"); });

  ArduinoOTA.onProgress([](unsigned int progress, unsigned int total) {
    Serial.printf("Progress: %u%%\\r", (progress / (total / 100)));
  });

  ArduinoOTA.onError([](ota_error_t error) {
    Serial.printf("Error[%u]: ", error);
    if (error == OTA_AUTH_ERROR) Serial.println("Auth Failed");
    else if (error == OTA_BEGIN_ERROR) Serial.println("Begin Failed");
    else if (error == OTA_CONNECT_ERROR) Serial.println("Connect Failed");
    else if (error == OTA_RECEIVE_ERROR) Serial.println("Receive Failed");
    else if (error == OTA_END_ERROR) Serial.println("End Failed");
  });

  ArduinoOTA.begin();

  Serial.println("OTA Ready!");
  Serial.print("Hostname: ");
  Serial.println("esp32_device.local");
}

void loop() {
  ArduinoOTA.handle();
  digitalWrite(LED_BUILTIN, HIGH);
  delay(1000);
  digitalWrite(LED_BUILTIN, LOW);
  delay(1000);
}`;

function App() {
  // ---------- State ----------
  const [code, setCode] = useState(DEFAULT_CODE);
  const [output, setOutput] = useState("");
  const [selectedBoard, setSelectedBoard] = useState("");
  const [selectedPort, setSelectedPort] = useState("");
  const [selectedOTADevice, setSelectedOTADevice] = useState("");
  const [uploadMethod, setUploadMethod] = useState("usb");
  const [isCompiling, setIsCompiling] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [showSerialMonitor, setShowSerialMonitor] = useState(false);
  const [compilationId, setCompilationId] = useState(null);

  // ---------- Terminal ----------
  const appendOutput = useCallback((text) => {
    setOutput((prev) => prev + text);
  }, []);

  const clearOutput = useCallback(() => setOutput(""), []);

  // ---------- Compile Progress ----------
  const handleCompileProgress = useCallback(
    (data) => {
      if (data.compilationId === compilationId) {
        appendOutput(
          `[${data.stage}] ${data.message || ""} ${
            data.percentage ? data.percentage + "%" : ""
          }\n`
        );
      }
    },
    [appendOutput, compilationId]
  );

  // ---------- WebSocket Setup ----------
  useEffect(() => {
    const wsUrl = `${
      process.env.REACT_APP_WS_URL || "ws://localhost:5000"
    }/ws/compile`;

    websocketService
      .connect(wsUrl)
      .then(() => {
        console.log("Connected to compile WebSocket");
        websocketService.on("progress", handleCompileProgress);
      })
      .catch((error) => console.error("WebSocket connection failed:", error));

    return () => {
      websocketService.off("progress", handleCompileProgress);
      websocketService.disconnect();
    };
  }, [handleCompileProgress]);

  // ---------- Handle board selection ----------
  useEffect(() => {
    if (selectedBoard) {
      const isESP =
        selectedBoard.includes("esp32") || selectedBoard.includes("esp8266");
      if (isESP && code === DEFAULT_CODE) {
        appendOutput("ℹ️ ESP board detected — try loading OTA example code.\n");
      }
    }
  }, [selectedBoard, code, appendOutput]);

  // ---------- Load OTA Example ----------
  const loadOTAExample = useCallback(() => {
    setCode(OTA_EXAMPLE_CODE);
    appendOutput("✓ OTA example code loaded. Update WiFi credentials!\n");
  }, [appendOutput]);

  // ---------- Compile ----------
  const handleVerify = useCallback(async () => {
    if (!selectedBoard) return alert("Please select a board");

    setIsCompiling(true);
    clearOutput();
    appendOutput("Starting compilation...\n");

    try {
      const response = await apiService.compile({
        code,
        boardId: selectedBoard,
        options: { optimization: "Os", debugSymbols: false },
      });

      setCompilationId(response.data.compilationId);
      const result = response.data.result;
      appendOutput(`\n✓ Compilation successful!\n`);
      appendOutput(`Build time: ${result.buildTime}ms\n`);
      appendOutput(
        `Firmware size: ${result.firmwareSize?.flash?.used || 0} bytes\n`
      );
      appendOutput(
        `Flash usage: ${result.firmwareSize?.flash?.percentage || 0}%\n`
      );
      appendOutput(
        `RAM usage: ${result.firmwareSize?.ram?.percentage || 0}%\n`
      );
    } catch (error) {
      appendOutput("\n✗ Compilation failed!\n");
      const errorData = error.response?.data;
      if (errorData?.error) appendOutput(`Error: ${errorData.error}\n`);
      if (errorData?.details) appendOutput(`\nDetails:\n${errorData.details}\n`);
    } finally {
      setIsCompiling(false);
    }
  }, [selectedBoard, code, appendOutput, clearOutput]);

  // ---------- USB Upload ----------
  const handleUpload = useCallback(async () => {
    if (!selectedBoard) return alert("Select a board");
    if (!selectedPort) return alert("Select a port");

    setIsUploading(true);
    clearOutput();
    appendOutput("Starting USB upload...\n");

    try {
      const response = await apiService.upload({
        code,
        boardId: selectedBoard,
        port: selectedPort,
        options: { optimization: "Os", verify: true },
      });

      appendOutput(`\n✓ Upload successful!\n`);
      appendOutput(`Upload time: ${response.data.result.upload.duration}ms\n`);
      appendOutput(
        `Bytes written: ${response.data.result.upload.bytesWritten}\n`
      );
      appendOutput(
        `Verified: ${response.data.result.upload.verified ? "Yes" : "No"}\n`
      );
    } catch (error) {
      appendOutput("\n✗ Upload failed!\n");
      const errorData = error.response?.data;
      if (errorData?.error) appendOutput(`Error: ${errorData.error}\n`);
      if (errorData?.details) appendOutput(`\nDetails:\n${errorData.details}\n`);
    } finally {
      setIsUploading(false);
    }
  }, [selectedBoard, selectedPort, code, appendOutput, clearOutput]);

  // ---------- OTA Upload ----------
  const handleUploadOTA = useCallback(async () => {
    if (!selectedBoard) return alert("Select a board");
    if (!selectedOTADevice) return alert("Select an OTA device");

    setIsUploading(true);
    clearOutput();
    appendOutput("Starting OTA upload over WiFi...\n");

    try {
      const response = await apiService.uploadOTA({
        code,
        boardId: selectedBoard,
        deviceId: selectedOTADevice,
        password: "",
      });

      appendOutput("\n✓ OTA Upload successful!\n");
      appendOutput(
        `Device: ${response.data.result.ota.device}\nIP: ${response.data.result.ota.ip}\n`
      );
      appendOutput("✓ Device rebooting with new firmware...\n");
    } catch (error) {
      appendOutput("\n✗ OTA Upload failed!\n");
      appendOutput("💡 Tips:\n- Ensure device has OTA firmware\n");
    } finally {
      setIsUploading(false);
    }
  }, [selectedBoard, selectedOTADevice, code, appendOutput, clearOutput]);

  // ---------- Serial Monitor ----------
  const handleSerialMonitor = useCallback(() => {
    if (!selectedPort) return alert("Select a port");
    setShowSerialMonitor(true);
  }, [selectedPort]);

  // ---------- Upload Method ----------
  const handleUploadMethodChange = useCallback(
    (method) => {
      setUploadMethod(method);
      appendOutput(`\nℹ️ Switched to ${method.toUpperCase()} mode.\n`);
    },
    [appendOutput]
  );

  // ---------- Render ----------
  return (
    <div className="app">
      <header className="app-header">
        <h1>Arduino IDE Online</h1>
        <div className="header-actions">
          {selectedBoard &&
            (selectedBoard.includes("esp32") ||
              selectedBoard.includes("esp8266")) && (
              <button
                className="load-ota-btn"
                onClick={loadOTAExample}
                title="Load OTA example code"
              >
                Load OTA Example
              </button>
            )}
        </div>
      </header>

      <Toolbar
        selectedBoard={selectedBoard}
        onBoardSelect={setSelectedBoard}
        selectedPort={selectedPort}
        onPortSelect={setSelectedPort}
        selectedOTADevice={selectedOTADevice}
        onOTADeviceSelect={setSelectedOTADevice}
        uploadMethod={uploadMethod}
        onUploadMethodChange={handleUploadMethodChange}
        onVerify={handleVerify}
        onUpload={handleUpload}
        onUploadOTA={handleUploadOTA}
        onSerialMonitor={handleSerialMonitor}
        isCompiling={isCompiling}
        isUploading={isUploading}
      />

      <div className="app-content">
        <div className="editor-panel">
          <Editor code={code} onChange={setCode} readOnly={isCompiling || isUploading} />
        </div>

        <div className="terminal-panel">
          <Terminal output={output} onClear={clearOutput} />
          <h3 style={{ marginLeft: "20px" }}>💬 AI Chatbot Assistant</h3>
          <Chatbot />
        </div>
      </div>

      {showSerialMonitor && selectedPort && (
        <SerialMonitor
          port={selectedPort}
          onClose={() => setShowSerialMonitor(false)}
        />
      )}
    </div>
  );
}

export default App;
