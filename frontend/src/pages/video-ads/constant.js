export const PROMPT = `Tạo kịch bản video dưới 20s quảng cáo dành cho phụ nữ bằng ý tưởng từ banner quảng cáo trong ảnh này tối đa 4-5 shot video mỗi shot tối đa khoảng 5s sử dụng các loại motion control này :
Các tuỳ chọn "Motion Control" : None, Crane Down, Crane Up, Crash Zoom In, Disintegration, Dolly In, Dolly Left, Dolly Out, Dolly Right, Explosion, Medium Zoom In, Orbit Left, Orbit Right, Tilt Down, Tilt Up.
\n Trả về dưới dạng json với cấu trúc dưới đây không viết gì thêm \n
[
{
"shot": "1",
"scene_description": "................",
"camera_movement": "................",
"visual_effects": "................",
"on_screen_text_if_need": "................",
"mood": "................",
"duration": "................"
},
{
"shot": "2",
"scene_description": "................",
"camera_movement": "................",
"visual_effects": "................",
"on_screen_text_if_need": "................",
"mood": "................",
"duration": "................"
}, ....]`;

export const PROMPT_GENERATE_IMAGE_AND_VIDEO = `Dựa vào kịch bản {responsive_shot_1)
cho shot quay này hãy viết cho tôi prompt tiếng anh để tạo ảnh cảnh đầu tiên của shot trên sao cho phù hợp với kịch bản nhất có thể. prompt với cấu trúc dành cho chat gpt image .Sau đó viết tiếp prompt video dành cho Kling AI theo công thức :
Xây dựng Câu lệnh (Prompt) Chi tiết theo Cấu trúc 5 Phần Điện ảnh
Đây là bước quan trọng nhất. Hãy thật chi tiết!
Mô tả Chủ thể:
Ví dụ Text-to-Video (Phi hành gia): "Một nữ phi hành gia dũng cảm trong bộ đồ vũ trụ màu trắng bạc, với những chi tiết phản quang tinh xảo."
Ví dụ Image-to-Video (Đã có ảnh con mèo): (Phần này đã có sẵn trong ảnh, tập trung vào hành động)
Hành động:
Ví dụ Text-to-Video (Phi hành gia): "... đang cắm một lá cờ kim loại có biểu tượng Trái Đất lên bề mặt bụi bặm của một hành tinh xa lạ."
Ví dụ Image-to-Video (Mèo): "Con mèo Ba Tư lông xù đang chậm rãi vươn vai, ngáp một cái thật to, đôi mắt xanh biếc lim dim."
Môi trường:
Ví dụ Text-to-Video (Phi hành gia): "... với bầu trời màu tím huyền ảo, hai mặt trăng lớn lơ lửng và những dãy núi đá nhọn hoắt ở phía xa."
Ví dụ Image-to-Video (Mèo): (Đã có sẵn trong ảnh, có thể bổ sung chi tiết nếu muốn AI thay đổi nhẹ) "Trên một chiếc ghế sofa nhung màu xanh đậm, bên cạnh một cửa sổ lớn nhìn ra khu vườn đầy nắng."
Ánh sáng & Bầu không khí/Không khí:
Ví dụ Text-to-Video (Phi hành gia): "Ánh sáng kỳ lạ từ một tinh vân gần đó chiếu xuống, tạo ra những bóng đổ dài và một cảm giác bí ẩn, điện ảnh, độ phân giải 8K."
Ví dụ Image-to-Video (Mèo): "Ánh nắng chiều ấm áp chiếu xiên qua cửa sổ, tạo những vệt sáng trên bộ lông mềm mại của con mèo, không khí yên bình, ấm cúng."
Chuyển động Camera:
Ví dụ Text-to-Video (Phi hành gia): "Camera từ từ xoay quanh phi hành gia, bắt đầu từ góc thấp và di chuyển lên cao để làm nổi bật hành động cắm cờ và khung cảnh hùng vĩ."
Ví dụ Image-to-Video (Mèo): "Camera giữ nguyên vị trí, tập trung vào biểu cảm của con mèo, có thể zoom nhẹ vào khuôn mặt khi nó ngáp."
\n Trả về dưới dạng json dưới đây không viết gì thêm. Ví dụ: \n
{"id": 1,
"image_start_prompt": "..............................",
"ai_video_prompt": ".............................",
}`