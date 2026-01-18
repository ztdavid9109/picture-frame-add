// Firebase config
const firebaseConfig = {
 apiKey: "AIzaSyBYbok0BpACrOmLkQA7uZ6ZkpquvLVTkIQ",
  authDomain: "picture-frame-2fef0.firebaseapp.com",
  projectId: "picture-frame-2fef0",
  storageBucket: "picture-frame-2fef0.firebasestorage.app",
  messagingSenderId: "662594927100",
  appId: "1:662594927100:web:df53b2e5f2861f9660da79",
  measurementId: "G-25BBEKSHB2"
};

let storage, db, auth;
let firebaseReady = false;

// Slideshow variables
let allPhotos = [];
let currentPhotoIndex = 0;
let slideshowRunning = false;
let slideshowInterval = null;

// Initialize Firebase
try {
    if (typeof firebase !== 'undefined' && firebase.apps.length === 0) {
        const app = firebase.initializeApp(firebaseConfig);
        auth = firebase.auth();
        storage = firebase.storage();
        db = firebase.firestore();
        
        // Enable anonymous authentication
        auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL)
            .then(() => {
                return auth.signInAnonymously();
            })
            .then(() => {
                firebaseReady = true;
                console.log("✅ Firebase initialized with anonymous auth");
                document.getElementById("status").textContent = "✅ Ready to upload";
                loadPhotos();
            })
            .catch(err => {
                console.error("Auth error:", err);
                firebaseReady = true;
                loadPhotos();
            });
    }
} catch (err) {
    console.error("Firebase init error:", err);
    document.getElementById("status").textContent = "❌ Firebase error: " + err.message;
}

function upload() {
    if (!firebaseReady) {
        document.getElementById("status").textContent = "⏳ Firebase is initializing... Please wait";
        return;
    }

    const file = document.getElementById("fileInput").files[0];
    if (!file) {
        document.getElementById("status").textContent = "Please select a file";
        return;
    }

    const status = document.getElementById("status");
    status.textContent = "Uploading...";

    const ref = storage.ref(`photos/${Date.now()}_${file.name}`);

    ref.put(file)
        .then((snapshot) => {
            console.log("Upload successful:", snapshot);
            return ref.getDownloadURL();
        })
        .then(url => {
            console.log("Download URL:", url);
            return db.collection("photos").add({
                url: url,
                fileName: file.name,
                uploadedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
        })
        .then((docRef) => {
            console.log("Document written with ID:", docRef.id);
            status.textContent = "✅ Upload complete!";
            document.getElementById("fileInput").value = "";
            loadPhotos();
        })
        .catch(err => {
            console.error("Upload error:", err);
            status.textContent = "❌ Error: " + err.message;
        });
}

function loadPhotos() {
    db.collection("photos")
        .orderBy("uploadedAt", "desc")
        .limit(50)
        .onSnapshot(snapshot => {
            const photosGrid = document.getElementById("photosGrid");
            photosGrid.innerHTML = "";

            if (snapshot.empty) {
                photosGrid.innerHTML = "<p>No photos yet. Upload your first photo!</p>";
                document.getElementById("slideshowContainer").style.display = "none";
                document.getElementById("noPhotosMessage").style.display = "block";
                allPhotos = [];
                return;
            }

            allPhotos = [];
            snapshot.forEach(doc => {
                const photo = doc.data();
                allPhotos.push({
                    id: doc.id,
                    ...photo
                });

                const card = document.createElement("div");
                card.className = "photo-card";
                card.innerHTML = `
                    <img src="${photo.url}" alt="Photo" onerror="this.src='data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22200%22 height=%22200%22%3E%3Crect fill=%22%23ddd%22 width=%22200%22 height=%22200%22/%3E%3Ctext x=%2250%25%22 y=%2250%25%22 text-anchor=%22middle%22 dy=%22.3em%22 fill=%22%23999%22%3EImage Error%3C/text%3E%3C/svg%3E'">
                    <div class="photo-info">
                        <small>${new Date(photo.uploadedAt?.toDate()).toLocaleDateString()}</small>
                        <button class="delete-btn" onclick="deletePhoto('${doc.id}')">Delete</button>
                    </div>
                `;
                photosGrid.appendChild(card);
            });

            // Show slideshow if photos exist
            if (allPhotos.length > 0) {
                document.getElementById("slideshowContainer").style.display = "block";
                document.getElementById("noPhotosMessage").style.display = "none";
                currentPhotoIndex = 0;
                displaySlide();
            } else {
                document.getElementById("slideshowContainer").style.display = "none";
                document.getElementById("noPhotosMessage").style.display = "block";
            }
        }, err => {
            console.error("Error loading photos:", err);
            document.getElementById("photosGrid").innerHTML = "<p>Error loading photos</p>";
        });
}

function displaySlide() {
    if (allPhotos.length === 0) return;
    
    const photo = allPhotos[currentPhotoIndex];
    document.getElementById("slideshowImage").src = photo.url;
    document.getElementById("slideshowCounter").textContent = `${currentPhotoIndex + 1} / ${allPhotos.length}`;
    document.getElementById("slideshowDate").textContent = new Date(photo.uploadedAt?.toDate()).toLocaleDateString();
}

function nextPhoto() {
    if (allPhotos.length === 0) return;
    currentPhotoIndex = (currentPhotoIndex + 1) % allPhotos.length;
    displaySlide();
}

function previousPhoto() {
    if (allPhotos.length === 0) return;
    currentPhotoIndex = (currentPhotoIndex - 1 + allPhotos.length) % allPhotos.length;
    displaySlide();
}

function toggleSlideshow() {
    if (allPhotos.length === 0) return;
    
    slideshowRunning = !slideshowRunning;
    const btn = document.getElementById("playpauseBtn");
    
    if (slideshowRunning) {
        btn.textContent = "Pause";
        slideshowInterval = setInterval(() => {
            nextPhoto();
        }, 3000); // Change photo every 3 seconds
    } else {
        btn.textContent = "Play";
        clearInterval(slideshowInterval);
    }
}

function deletePhoto(docId) {
    if (!confirm("Delete this photo?")) return;
    
    db.collection("photos").doc(docId).delete()
        .then(() => {
            console.log("Photo deleted");
            loadPhotos();
        })
        .catch(err => console.error("Delete error:", err));
}
