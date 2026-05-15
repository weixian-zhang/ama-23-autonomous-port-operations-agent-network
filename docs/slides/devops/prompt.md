
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

* create the infographic of 2 silo separated devops process step by step
* clearly separate 2 processes
* do not include title
* Do not duplicate graphics
* use uploaded image as style guide

## onboard Nvidia Jetson edge device

FACTORY
├─ 1. for each Nvidia Jetson Odin device, factory generate key-pair, private store in TPM. 
|- 2. OEM pass public keys to Salacia team, we generate CSR from public keys and get them CA signed.
├─ 3. Salacia team pass signed device certs to factory.
├─ 4. Factory injects each cert into device cert store
├─ 6. Factory deploys Azure DPS client and config on device
|- 7. device now has private key, signed cert, DPS ID + global Url
|- 8. Devices send to Salacia team
├─ 9. Boot up devices, DPS clients connects to DPS from DPS config (TLS)
├─ 10. DPS verifies cert chain and creates device in IoT Hub
└─ 11. Devices send to Salacia team

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
