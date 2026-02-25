import json
import sys

filepath = r"c:\Users\jefer\Desktop\ApexMind\web-platform\data\telemetry\044d33ca-f4ad-4a82-b230-054cfa152158.json"

try:
    with open(filepath, 'r') as f:
        content = f.read()
        
    try:
        data = json.loads(content)
    except:
        # Try ndjson
        data = [json.loads(line) for line in content.splitlines() if line.strip()]

    print(f"Total points: {len(data)}")
    
    zeros = 0
    non_zeros = 0
    sample = None
    
    for p in data:
        lat = p.get('lat', 0)
        lon = p.get('lon', 0)
        if lat == 0 and lon == 0:
            zeros += 1
        else:
            non_zeros += 1
            if not sample:
                sample = (lat, lon)
                
    print(f"Zero Points: {zeros}")
    print(f"Valid Points: {non_zeros}")
    if sample:
        print(f"Sample Valid: {sample}")
    else:
        print("No valid GPS data found.")

except Exception as e:
    print(f"Error: {e}")
