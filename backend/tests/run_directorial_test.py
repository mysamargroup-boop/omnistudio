import asyncio
import httpx
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))
from auth import create_studio_jwt

async def run_directorial_test():
    token = create_studio_jwt()
    headers = {'Authorization': f'Bearer {token}'}
    base = 'http://127.0.0.1:8000'

    payload = {
        'prompt': 'Indian model wearing royal emerald jewellery, 2 scenes, 4 seconds video',
        'mode': 'assisted',
        'num_scenes': 2,
        'style': 'cinematic',
        'aspect_ratio': '9:16',
        'image_model': 'gemini_flash_image',
        'video_model': 'omni_flash',
        'apply_brand_kit': False
    }

    async with httpx.AsyncClient(timeout=300) as client:
        # 1. Start pipeline
        r = await client.post(f'{base}/api/pipeline/agent/start', json=payload, headers=headers)
        res = r.json()
        print('1. Pipeline Started:', res)
        p_id = res.get('pipeline_id')
        if not p_id:
            return

        print(f'2. Streaming pipeline events for {p_id}...')
        gate_count = 0
        async with client.stream('POST', f'{base}/api/pipeline/agent/stream/{p_id}', headers=headers, timeout=300) as stream:
            async for line in stream.aiter_lines():
                if not line.startswith('data:'):
                    continue
                raw_data = line[5:].strip()
                if not raw_data:
                    continue
                try:
                    event = json.loads(raw_data)
                    state = event.get('state')
                    logs = event.get('logs', [])
                    last_log = logs[-1] if logs else {}
                    msg = last_log.get('message', '')[:65]
                    agent = last_log.get('agent_name', 'System')
                    print(f'   -> State: {state:<18} | Agent: {agent:<22} | Msg: {msg}')

                    # If paused at Gate 1 or Gate 2, call approve!
                    if state == 'paused':
                        gate_count += 1
                        print(f'\n   >>> [GATE {gate_count} PAUSE DETECTED] Approving step...\n')
                        app_r = await client.post(f'{base}/api/pipeline/agent/approve/{p_id}', headers=headers)
                        print(f'   >>> Approved response: {app_r.json()}\n')

                    if state in ('complete', 'failed'):
                        print(f'\n3. Pipeline Finished with state: {state}')
                        print(f'   Master video: {event.get("master_video")}')
                        scenes = event.get('scenes', [])
                        print(f'   Scenes count: {len(scenes)}')
                        for sc in scenes:
                            print(f'      Scene {sc.get("index")}: {sc.get("title")}')
                            print(f'         Prompt: {sc.get("image_prompt", "")[:90]}...')
                            print(f'         Image:  {sc.get("image_path")}')
                            print(f'         Video:  {sc.get("video_path")}')

                        # 4. Test Publishing step
                        print('\n4. Testing Omnichannel Publishing step...')
                        pub_payload = {
                            'pipeline_id': p_id,
                            'channels': ['youtube', 'instagram'],
                            'title': 'Royal Emerald Jewellery Campaign',
                            'caption': 'Stunning Indian model showcasing royal emerald jewellery #luxury #jewellery',
                            'video_path': event.get('master_video') or (scenes[0].get('video_path') if scenes else None)
                        }
                        pub_r = await client.post(f'{base}/api/pipeline/agent/publish', json=pub_payload, headers=headers)
                        print('   Publish result:', pub_r.json())
                        break
                except Exception as e:
                    pass

if __name__ == '__main__':
    asyncio.run(run_directorial_test())
