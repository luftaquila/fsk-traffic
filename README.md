# Formula Student Korea Traffic Controller

## Schematics

![](/.github/fsk-traffic-control.jpg)

## Development

### Controller firmware

#### Prerequisites

```sh
git clone https://github.com/luftaquila/fsk-traffic.git
```

* `arm-none-eabi-gcc` ([AArch32 bare-metal target (arm-none-eabi)](https://developer.arm.com/downloads/-/arm-gnu-toolchain-downloads))
* make
* openocd

#### Build and upload

```sh
cd device/firmware
make program
```
