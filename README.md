# Formula Student Korea Traffic Controller

## Schematics

![](/.github/fsk-traffic-control.jpg)

## Development

### Controller firmware

#### Prerequisites

```sh
git clone https://github.com/luftaquila/fsk-traffic-control.git --recursive
```

* `arm-none-eabi-gcc` ([AArch32 bare-metal target (arm-none-eabi)](https://developer.arm.com/downloads/-/arm-gnu-toolchain-downloads))
* make
* openocd

#### Build and upload

```sh
cd device/firmware
make program
```

### Desktop Application

#### Prerequisites

* [Node.js](https://nodejs.org/en/download/package-manager) >= v20
* [Rust](https://www.rust-lang.org/tools/install) >= 1.81.0

```sh
git clone https://github.com/luftaquila/fsk-traffic-control.git --recursive
cd fsk-traffic-control/native
npm install
```

#### Build and run

```sh
npm run tauri dev
npm run tauri build
```
