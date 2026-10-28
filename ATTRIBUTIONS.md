# 출처와 라이선스

- 앱의 작성자 코드는 [MIT License](LICENSE)를 적용합니다.
- 포함된 shadcn/ui component는 MIT로 사용하며 전문은 [shadcn-ui.txt](THIRD_PARTY_LICENSES/shadcn-ui.txt)에 유지합니다.
- JSZip3.10.1은 격리 test ZIP 생성에만 사용합니다. MIT 선택 고지와 원본 전문은 [JSZip.txt](THIRD_PARTY_LICENSES/JSZip.txt)에 있습니다. production ZIP 해제는 browser Compression Streams를 사용합니다.
- 번들하는 React·React DOM·Lucide의 원 license도 `THIRD_PARTY_LICENSES/`에 유지합니다. 나머지 설치 패키지는 각 package의 고지를 따릅니다.
- favicon과 metadata SVG는 이 edition에서 작성한 vector입니다. 사진·실제 계정 명단·개인 ZIP·사용자 후기나 실적은 배포하지 않습니다.

- 실제 production JS module graph와 CSS 의존성의 전문 고지는 [THIRD_PARTY_NOTICES.txt](public/THIRD_PARTY_NOTICES.txt)에 보존합니다. build는 이를 `dist/THIRD_PARTY_NOTICES.txt`로 복사하므로 정적 hosting 시 함께 배포하세요. Apache-2.0 등 각 의존성의 권리는 앱 MIT와 구분됩니다.
