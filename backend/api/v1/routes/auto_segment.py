import asyncio
from http.client import HTTPException
import json
from api.v1.schemas.auto_segment import (
    ImageProcessRequest,
    SegmentationResult,
    WebSocketMessage,
)
from api.v1.services.auth import get_current_user
from api.v1.services.auto_segment import process_image_with_sam
from core.database import get_db
from core.websocket import manager
from fastapi import APIRouter, WebSocket, WebSocketDisconnect

router = APIRouter()


# @router.post("/process-image", response_model=SegmentationResult)
# async def process_image(request: ImageProcessRequest):
#     try:
#         result = await process_image_with_sam(
#             request.image_url,
#             request.prompts,
#             request.box_prompts,
#             request.output_format,
#         )

#         result_image_url = result.get("image", {}).get("url", "")
#         if request.client_id and result_image_url:
#             try:
#                 await manager.send_json(
#                     {
#                         "status": "success",
#                         "result": {
#                             "image_url": result_image_url,
#                             "original_image_url": request.image_url,
#                         },
#                     },
#                     request.client_id,
#                 )
#             except Exception as ws_error:
#                 print(f"Không thể gửi qua WebSocket: {str(ws_error)}")

#         return SegmentationResult(
#             image_url=result_image_url, original_image_url=request.image_url
#         )
#     except Exception as e:
#         if request.client_id:
#             try:
#                 await manager.send_json(
#                     {"status": "error", "message": f"Lỗi: {str(e)}"}, request.client_id
#                 )
#             except:
#                 pass

#         raise HTTPException(status_code=500, detail=f"Lỗi khi xử lý request: {str(e)}")


@router.websocket("/{client_id}")
async def websocket_endpoint(websocket: WebSocket, client_id: str):
    await websocket.accept()

    try:
        print(f"Client {client_id} đã kết nối")
        await manager.connect(websocket, client_id)

        # Thêm vòng lặp để xử lý nhiều message
        while True:
            try:
                data = await websocket.receive_text()
                message_data = json.loads(data)
                action = message_data.get("action")

                if action == "process_image":
                    # Xử lý action process_image
                    await manager.send_json(
                        {"status": "processing", "message": "Đang xử lý ảnh..."},
                        client_id,
                    )

                    image_url = message_data.get("image_url")
                    prompts = message_data.get("prompts")
                    box_prompts = message_data.get("box_prompts", [])

                    result = await process_image_with_sam(
                        image_url, prompts, box_prompts
                    )
                    result_image_url = result.get("image", {}).get("url", "")

                    if result_image_url:
                        await manager.send_json(
                            {
                                "status": "success",
                                "result": {
                                    "image_url": result_image_url,
                                    "original_image_url": image_url,
                                },
                            },
                            client_id,
                        )
                    else:
                        await manager.send_json(
                            {
                                "status": "error",
                                "message": "Không nhận được URL ảnh kết quả",
                            },
                            client_id,
                        )

                elif action == "update_prompt":
                    # Xử lý action update_prompt
                    print(f"Client {client_id} yêu cầu cập nhật prompt")
                    await manager.send_json(
                        {
                            "status": "processing",
                            "message": "Đang cập nhật với prompt mới...",
                        },
                        client_id,
                    )

                    image_url = message_data.get("image_url")
                    prompts = message_data.get("prompts")
                    box_prompts = message_data.get("box_prompts", [])

                    result = await process_image_with_sam(
                        image_url, prompts, box_prompts
                    )
                    result_image_url = result.get("image", {}).get("url", "")

                    if result_image_url:
                        print(f"Cập nhật prompt thành công cho client {client_id}")
                        await manager.send_json(
                            {
                                "status": "success",
                                "result": {
                                    "image_url": result_image_url,
                                    "original_image_url": image_url,
                                },
                            },
                            client_id,
                        )
                    else:
                        print(
                            f"Lỗi: Không nhận được URL ảnh kết quả cho client {client_id}"
                        )
                        await manager.send_json(
                            {
                                "status": "error",
                                "message": "Không nhận được URL ảnh kết quả",
                            },
                            client_id,
                        )

                elif action == "broadcast":
                    # Xử lý action broadcast
                    data = message_data.get("data", {})
                    print(f"Client {client_id} yêu cầu broadcast")
                    await manager.broadcast_to_user(
                        {
                            "status": "notification",
                            "message": "Có kết quả mới từ client khác",
                            "data": data,
                        },
                        client_id,
                    )

                else:
                    print(f"Client {client_id} gửi action không hợp lệ: {action}")
                    await manager.send_json(
                        {
                            "status": "error",
                            "message": f"Action không hợp lệ: {action}",
                        },
                        client_id,
                    )

            except json.JSONDecodeError:
                print(f"Lỗi: Dữ liệu JSON không hợp lệ từ client {client_id}")
                await manager.send_json(
                    {"status": "error", "message": "Dữ liệu JSON không hợp lệ"},
                    client_id,
                )
            except WebSocketDisconnect:
                # Client đã ngắt kết nối, thoát khỏi vòng lặp
                print(f"Client {client_id} đã ngắt kết nối")
                manager.disconnect(client_id)
                break
            except Exception as e:
                print(f"Lỗi khi xử lý message từ client {client_id}: {str(e)}")
                await manager.send_json(
                    {"status": "error", "message": f"Lỗi: {str(e)}"},
                    client_id,
                )

    except WebSocketDisconnect:
        print(f"Client {client_id} đã ngắt kết nối")
        manager.disconnect(client_id)

    except Exception as e:
        print(f"WebSocket error với client {client_id}: {str(e)}")
        manager.disconnect(client_id)

    print(f"Kết thúc xử lý cho client {client_id}")
