#!/bin/bash
mkdir -p public/models
cd public/models

BASE_URL="https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights"

echo "Downloading tiny_face_detector..."
curl -O "$BASE_URL/tiny_face_detector_model-weights_manifest.json"
curl -O "$BASE_URL/tiny_face_detector_model-shard1"

echo "Downloading face_landmark_68..."
curl -O "$BASE_URL/face_landmark_68_model-weights_manifest.json"
curl -O "$BASE_URL/face_landmark_68_model-shard1"

echo "Downloading face_recognition..."
curl -O "$BASE_URL/face_recognition_model-weights_manifest.json"
curl -O "$BASE_URL/face_recognition_model-shard1"
curl -O "$BASE_URL/face_recognition_model-shard2"

echo "Models downloaded."
