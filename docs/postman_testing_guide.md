# 🩸 Panduan Pengujian API PMI Pringsewu (Postman Guide)

Dokumentasi ini disusun untuk memandu Anda menguji seluruh *endpoint* Backend PMI Pringsewu secara menyeluruh menggunakan Postman. Kita akan menggunakan fitur **Environment Variables** Postman agar *testing* lebih praktis.

---

## 🛠️ Prasyarat: Konfigurasi Postman Environment
1. Buka Postman, klik **Environments** di sidebar kiri.
2. Buat environment baru dengan nama `PMI Local`.
3. Tambahkan variabel berikut (nilainya biarkan kosong, akan terisi otomatis nanti):
   - `base_url`: `http://localhost:3000/api/v1`
   - `token_user`: *(Kosongkan)*
   - `token_admin`: *(Kosongkan)*
   - `region_id`: *(Kosongkan)*
   - `donor_id`: *(Kosongkan)*
4. Pastikan Anda memilih environment `PMI Local` di pojok kanan atas layar Postman.

---

> [!WARNING]
> ## Cara Membuat Akun Admin (Penting)
> Endpoint untuk registrasi secara default membuat pengguna dengan hak akses `USER`. Agar Anda bisa menguji endpoint Manajemen Stok dan Riwayat Donor, Anda harus mengubah hak akses salah satu akun menjadi `ADMIN_PMI`.
>
> 1. Buka terminal di folder `pmi-backend`.
> 2. Jalankan `npx prisma studio`.
> 3. Studio akan terbuka di browser (http://localhost:5555).
> 4. Masuk ke tabel `User`, pilih akun Anda, dan ubah kolom `role` dari `USER` menjadi `ADMIN_PMI`.
> 5. **Save changes**.

---

## 🔐 Skenario 1: Modul Autentikasi

### 1A. Registrasi User Baru
- **Method:** `POST`
- **URL:** `{{base_url}}/auth/register`
- **Body (raw / JSON):**
  ```json
  {
      "email": "kosuke.user@pmi.id",
      "password": "Password123",
      "fullName": "Kosuke User",
      "nik": "1801010101010001",
      "whatsappNumber": "081234567891",
      "bloodType": "O",
      "rhesus": "POSITIVE"
  }
  ```
- **Tindak Lanjut Langkah:** Catat UUID yang didapatkan sebagai *user ID* Anda.

### 1B. Login (Sebagai User / Pendonor)
- **Method:** `POST`
- **URL:** `{{base_url}}/auth/login`
- **Body (raw / JSON):**
  ```json
  {
      "email": "kosuke.user@pmi.id",
      "password": "Password123"
  }
  ```
- **Postman Tests (Script otomatis simpan token):**
  Di tab *Tests* pada request Postman ini, masukkan kode berikut:
  ```javascript
  var jsonData = pm.response.json();
  pm.environment.set("token_user", jsonData.data.token);
  pm.environment.set("donor_id", jsonData.data.user.id);
  ```

### 1C. Login (Sebagai Admin)
*Lakukan ini dengan kredensial akun yang sudah Anda ubah `role`-nya melalui Prisma Studio.*
- **Method:** `POST`
- **URL:** `{{base_url}}/auth/login`
- **Body (raw / JSON):**
  ```json
  {
      "email": "admin@pmi.id",
      "password": "Password123"
  }
  ```
- **Postman Tests:**
  ```javascript
  var jsonData = pm.response.json();
  pm.environment.set("token_admin", jsonData.data.token);
  ```

### 1D. Cek Profil Saat Ini (Get Me)
- **Method:** `GET`
- **URL:** `{{base_url}}/auth/me`
- **Headers:** 
  - `Authorization: Bearer {{token_user}}`
- **Ekspektasi:** Mengambil detail pengguna beserta rentetan *history* (jika ada).

---

## 🏥 Skenario 2: Modul Region UDD (Cabang PMI)

### 2A. Tambah Wilayah PMI Baru [Khusus Admin]
- **Method:** `POST`
- **URL:** `{{base_url}}/regions`
- **Headers:** `Authorization: Bearer {{token_admin}}`
- **Body:**
  ```json
  {
      "name": "PMI Pringsewu Pusat",
      "address": "Jl. K.H. Gholib, Pringsewu Barat",
      "latitude": -5.3582,
      "longitude": 104.9754
  }
  ```
- **Postman Tests:** 
  *(Agar ID region langsung tersimpan untuk skenario selanjutnya)*
  ```javascript
  var jsonData = pm.response.json();
  pm.environment.set("region_id", jsonData.data.id);
  ```

### 2B. Lihat Seluruh Wilayah [Publik]
- **Method:** `GET`
- **URL:** `{{base_url}}/regions`
- **Header:** *(Tidak perlu Auth)*

### 2C. Update Wilayah PMI [Khusus Admin]
- **Method:** `PUT`
- **URL:** `{{base_url}}/regions/{{region_id}}`
- **Headers:** `Authorization: Bearer {{token_admin}}`
- **Body:**
  ```json
  {
      "address": "Jl. K.H. Gholib Update No. 12"
  }
  ```

### 2D. Hapus Wilayah PMI (Opsional)
- **Method:** `DELETE`
- **URL:** `{{base_url}}/regions/{{region_id}}`
- **Headers:** `Authorization: Bearer {{token_admin}}`

---

## 🩸 Skenario 3: Modul Matriks Stok Darah

### 3A. Tambah / Update Stok Darah (Upsert Matriks) [Khusus Admin]
*Data ini menggunakan matriks kombo Region + Golongan + Tipe Produk = Unik*
- **Method:** `POST`
- **URL:** `{{base_url}}/blood-stocks/upsert`
- **Headers:** `Authorization: Bearer {{token_admin}}`
- **Body:**
  ```json
  {
      "regionId": "{{region_id}}",
      "bloodType": "A",
      "productType": "PRC",
      "quantity": 15
  }
  ```
> [!TIP]
> Coba tekan *Send* dua kali dengan `quantity` yang berbeda (misal 15, lalu hit lagi dengan 20). Prisma akan secara cerdas menjalankan logikal **Update** (bukan menciptakan data turunan ganda). 

### 3B. Lihat Matriks Stok Darah [Publik]
- **Method:** `GET`
- **URL:** `{{base_url}}/blood-stocks`
- **Ekspektasi:** Output JSON akan mengikutsertakan (include) Region beserta daftar matriks stok (nested array).

---

## 📋 Skenario 4: Modul Riwayat & Gamifikasi Pendonor

### 4A. Mencatat Riwayat bahwa User Telah Berdonor Darah [Khusus Admin]
*Ini adalah Endpoint Transaksional terpenting di dalam backend.*
- **Method:** `POST`
- **URL:** `{{base_url}}/donors/record`
- **Headers:** `Authorization: Bearer {{token_admin}}`
- **Body:**
  ```json
  {
      "userId": "{{donor_id}}",
      "locationName": "Mobil Unit Donor Ambarawa",
      "donationDate": "2026-04-16T10:00:00Z"
  }
  ```
> [!IMPORTANT]
> Saat *Endpoint* ini dipukul, Backend tidak hanya menulis riwayat pada *history*, namun otomatis me-refresh kolom profil *user*. 

### 4B. User Mengecek Riwayat & Total Poin Donasinya Sendiri [User Biasa]
- **Method:** `GET`
- **URL:** `{{base_url}}/donors/my-history`
- **Headers:** `Authorization: Bearer {{token_user}}`
- **Ekspektasi:** Menampilkan "Mobil Unit Donor Ambarawa".

- **(Validasi Silang):** Lakukan kembali `GET {{base_url}}/auth/me` menggunakan token user. Anda akan melihat bahwa `lastDonationDate` dan `totalDonations` miliknya sudah bertambah satu.

### 4C. Admin Mendelegasi / Menginvestigasi Rekam Riwayat Seseorang
- **Method:** `GET`
- **URL:** `{{base_url}}/donors/{{donor_id}}/history`
- **Headers:** `Authorization: Bearer {{token_admin}}`

---

## 🎉 Cek Kesehatan Total Server (Health Check)
- **Method:** `GET`
- **URL:** `{{base_url}}/health`
- **Ekspektasi:** Memunculkan JSON stempel waktu aktif dengan pesan `PMI Donorku API berjalan dengan baik 🩸`.
