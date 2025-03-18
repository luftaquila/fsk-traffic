/* USER CODE BEGIN Header */
/**
  ******************************************************************************
  * @file           : main.h
  * @brief          : Header for main.c file.
  *                   This file contains the common defines of the application.
  ******************************************************************************
  * @attention
  *
  * Copyright (c) 2024 STMicroelectronics.
  * All rights reserved.
  *
  * This software is licensed under terms that can be found in the LICENSE file
  * in the root directory of this software component.
  * If no LICENSE file comes with this software, it is provided AS-IS.
  *
  ******************************************************************************
  */
/* USER CODE END Header */

/* Define to prevent recursive inclusion -------------------------------------*/
#ifndef __MAIN_H
#define __MAIN_H

#ifdef __cplusplus
extern "C" {
#endif

/* Includes ------------------------------------------------------------------*/
#include "stm32f4xx_hal.h"

/* Private includes ----------------------------------------------------------*/
/* USER CODE BEGIN Includes */
#include <stdint.h>
/* USER CODE END Includes */

/* Exported types ------------------------------------------------------------*/
/* USER CODE BEGIN ET */

/* USER CODE END ET */

/* Exported constants --------------------------------------------------------*/
/* USER CODE BEGIN EC */

/* USER CODE END EC */

/* Exported macro ------------------------------------------------------------*/
/* USER CODE BEGIN EM */

/* USER CODE END EM */

/* Exported functions prototypes ---------------------------------------------*/
void Error_Handler(void);

/* USER CODE BEGIN EFP */

/* USER CODE END EFP */

/* Private defines -----------------------------------------------------------*/
#define LED_Pin GPIO_PIN_13
#define LED_GPIO_Port GPIOC
#define SENS2_Pin GPIO_PIN_12
#define SENS2_GPIO_Port GPIOB
#define SENS2_EXTI_IRQn EXTI15_10_IRQn
#define SENS1_Pin GPIO_PIN_13
#define SENS1_GPIO_Port GPIOB
#define SENS1_EXTI_IRQn EXTI15_10_IRQn
#define GREEN_Pin GPIO_PIN_8
#define GREEN_GPIO_Port GPIOB
#define RED_Pin GPIO_PIN_9
#define RED_GPIO_Port GPIOB

/* USER CODE BEGIN Private defines */
#define true  (1)
#define false (0)

/*******************************************************************************
 * USB CDC command from the host system
 ******************************************************************************/
typedef enum {
  CMD_HELLO, // greetings
  CMD_GREEN, // green on, red off
  CMD_RED,   // green off, red on
  CMD_OFF,   // both off
  CMD_RESET, // reset controller
} usb_cmd_type_t;

#define USB_Command(CMD) \
  (strncmp((const char *)UserRxBufferFS, usb_cmd[CMD], strlen(usb_cmd[CMD])) == 0)

#define USB_Transmit(buf)                                                      \
  {                                                                            \
    uint8_t usb_ret;                                                           \
    do {                                                                       \
      usb_ret = CDC_Transmit_FS((uint8_t *)buf, strlen((const char *)buf));    \
    } while (usb_ret == USBD_BUSY);                                            \
  }


/*******************************************************************************
 * traffic light control
 ******************************************************************************/
#define RED(POWER) \
  HAL_GPIO_WritePin(RED_GPIO_Port, RED_Pin, POWER ? GPIO_PIN_SET : GPIO_PIN_RESET);
#define GREEN(POWER) \
  HAL_GPIO_WritePin(GREEN_GPIO_Port, GREEN_Pin, POWER ? GPIO_PIN_SET : GPIO_PIN_RESET);


/*******************************************************************************
 * printf
 ******************************************************************************/
#ifdef DEBUG
#define DEBUG_MSG(...) printf(__VA_ARGS__)
#else /* DEBUG */
#define DEBUG_MSG(...)
#endif /* DEBUG */
/* USER CODE END Private defines */

#ifdef __cplusplus
}
#endif

#endif /* __MAIN_H */
