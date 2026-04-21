
## style guide

Style: The style is a clean, technical digital drawing 
Atmosphere: 8k resolution, architectural concept art style., clinical, and innovative.
Visuals: High-tech futuristic architectural details balanced with a polished, professional slightly cartoonish yet realistic.
Lighting: Bright, high-key, and sterile.
Finish: Clean surfaces, crisp edges, and sophisticated tech-design.

## context

* Salacia is a fake next generation AI powered terminal OS used in port
* edge device is Nvidia Jetson Orin Nano
* edge agent is Salacia Edge Agent

## tasks

* create the infographic of 2 devops process step by step
* do not include title

## onboard Nvidia Jetson edge device with IoT DPS

FACTORY
├─ 1. Flash DPS client onto device
├─ 2. TPM generates private key (stays in TPM)
├─ 3. TPM generates CSR (public key)
├─ 4. CSR → CA → CA issues certificate
├─ 5. Certificate installed on device
├─ 6. DPS config installed on device
└─ 7. Device shipped

        │
        ▼
FIRST BOOT
├─ 8. DPS client reads config
├─ 9. Connects to DPS from DPS config (TLS)
├─ 10. Sends certificate + proves private key
├─ 11. DPS verifies cert chain and creates device in IoT Hub
└─ 12. Device connects to IoT Hub

## deploy Salacia Edge Agents to edge device devops process

1. Code Commit (main branch) 
↓
2. GitHub Actions Triggered 
↓
3. Build Docker Image
↓
4. Push Image → Azure Container Registry (ACR) 
↓
5. az iot edge set-modules / deployment create
↓
6. IoT Hub tells edge device to pull new image version
↓
7. edge device pulls new module image from ACR 
↓ 
8. $edgeAgent restarts module container 
↓ 
9. Module Live on Edge Device
