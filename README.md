# 暖析日誌 · 日誌診斷與分類工具

一個以瀏覽器操作的日誌檔案閱讀與分類工具。可將 `.LOG` 或 `.TXT` 日誌載入頁面，依照工具內建規則分類，並檢視診斷資訊。

## 使用功能

- 匯入 `.LOG` / `.TXT` 日誌檔案（可拖曳或選取）
- 依照分類結果切換「成功」、「失敗」、「警告」與「其他」
- 展開失敗與警告項目，查看可能原因及建議檢查方向
- 使用關鍵字搜尋日誌內容
- 查看分類統計
- 將診斷報告下載為 `.txt` 檔案

## 線上使用

部署至 GitHub Pages 後，可直接透過網站網址開啟，不需要安裝 Node.js、npm，也不需要啟動後端服務。

## 離線使用

本專案提供 Windows 單一檔案版本：

1. 下載本專案中的 `index.html`。
2. 使用 Google Chrome 或 Microsoft Edge 開啟。
3. 可直接載入日誌檔案使用；日誌分類與診斷在瀏覽器端執行。

單檔版本保留 Google Fonts 字型的線上引用；離線時會改用系統字型，不影響主要功能。

## GitHub Pages 部署

Repository 設定方式：

1. 開啟 **Settings → Pages**。
2. 在 **Build and deployment** 選擇 **Deploy from a branch**。
3. Branch 選擇 **main**，資料夾選擇 **/(root)**。
4. 按下 **Save**，等待 GitHub Pages 完成部署。

網站網址預期為：

https://awang00500.github.io/html-log-reader/

## 專案說明

目前網站部署使用 Windows 單一檔案版本，避免引入建置工具或伺服器需求。原始開發專案與建置設定不屬於 GitHub Pages 必要部署內容。
