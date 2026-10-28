# 팔로워 기록 비교

최종 갱신: 2026. 10. 28.

Meta에서 내보낸 JSON ZIP의 팔로워·팔로잉을 브라우저 안에서 비교하는 도구입니다. 계정 로그인이나 접속 권한을 요청하지 않습니다. 결과는 파일에 담긴 시점의 기록이며 현재 계정 상태를 조회하거나 변경하지 않습니다.

## 실행과 검사

Node.js22.12 이상과 npm이 필요합니다. CI는 Node.js22와 Ubuntu를 사용합니다.

```sh
npm ci
npm run typecheck
npm run lint
npm test
npm run build
npm run dev
```

빌드 결과는 `dist/`이며 `npm run preview`로 확인하거나 정적 hosting에 배포할 수 있습니다. 환경 변수와 서버 API는 필요하지 않습니다. `npm audit --audit-level=high`로 dependency를 검사합니다.

## 지원 범위

- `followers_1.json`, `followers_2.json`처럼 번호가 붙은 followers 파일과 `following.json`을 ZIP 안의 하위 폴더에서도 읽습니다. `followers.json`도 지원합니다. 두 종류의 파일이 존재하면 빈 배열도 유효합니다.
- followers는 계정 record 배열 또는 `relationships_followers` 배열, following은 계정 record 배열 또는 `relationships_following` 배열을 읽습니다. record의 `string_list_data`와 이름의 형식을 검증하며 임의의 다른 배열을 대입하지 않습니다.
- 계정 이름은1~30자의 영문·숫자·점·밑줄을 지원합니다. 대소문자를 정규화하고 중복을 제거하여 맞팔로우·한쪽만 팔로우하는 집합을 비교합니다.
- 제공된 경우 대기/최근 요청·차단·최근 팔로우 취소·제거된 추천의 알려진 파일과 대응 key를 따로 표시합니다. 과거 요청/취소 기록을 현재 followers/following 집합에서 임의로 빼지 않습니다.
- 목록은100명씩 표시하며 TXT·HTML·JSON 파일에는 전체 결과를 내보냅니다. HTML의 문자열을 escape하고 프로필 URL은 고정 HTTPS Instagram 주소에서만 생성합니다. archive의 href는 사용하지 않습니다.

## 한도와 개인정보

압축 ZIP100MB, 전체 선언 해제 크기100MB, 개별 관계 JSON20MB, ZIP 항목2000개까지 처리합니다. 각 관계 JSON은 중복 제거 전 record100,000개까지 지원합니다. 과도한 압축률, 위조 크기, 무결성 오류, 암호화·분할 ZIP·ZIP64는 거부합니다. 실제 해제 stream에도 byte 상한을 적용하고 초과·취소 시 reader를 취소합니다. UTF-8 decode와 JSON parse는 해제 한도 검사 뒤에 수행합니다.

DEFLATE 처리는 [Compression Streams 표준](https://compression.spec.whatwg.org/)의 `DecompressionStream('deflate-raw')`가 필요합니다. 미지원 브라우저는 오류를 안내합니다. ZIP 전체의 압축 bytes를 메모리에 읽고, 지원하지 않는 항목은 해제하거나 JSON parse하지 않습니다. 외부 데이터 인증이나 export의 원본 여부 검증은 수행하지 않습니다.

ZIP·분석 결과를 서버나 browser storage에 전송/저장하지 않습니다. 새로고침하면 메모리의 작업이 사라집니다. 새 파일을 선택하면 이전 작업을 취소합니다. profile link를 직접 선택하면 Instagram으로 이동하며 그 시점부터 외부 서비스의 정책이 적용됩니다. Meta·Instagram과 제휴하지 않은 독립 도구입니다.

## 검증 범위

자동 검사는 실제 ZIP stream·schema·빈 계정·중복·여러 followers 파일·미지원 이름·위조 expanded size·JSON parse 전 취소·HTML escape와 실제 App의 새 upload·input reset·storage 거부·3종 다운로드·URL 정리를 확인합니다. fixture는 test 전용으로 생성하며 실제 계정의 export나 개인 명단은 사용하지 않습니다. 실제 browser의 파일 선택·다운로드·AX·반응형 검증은 별도 QA 범위입니다.

## License

[MIT](LICENSE)와 [ATTRIBUTIONS.md](ATTRIBUTIONS.md)를 확인하세요.
