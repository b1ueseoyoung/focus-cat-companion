# focus-cat-companion

Claude Code 터미널 입력창 위에 표시하는 4줄 픽셀 고양이와 로컬 뽀모도로 Mod입니다. 기본 A와 선택 가능한 B는 8×8 픽셀입니다. 답변 중에는 걷고 가장자리에서 방향을 바꾸며 승인 대기 중에는 멈춥니다. 정상 답변 완료 후 8프레임·960ms 춤을 한 번 재생한 뒤 정지합니다.

GitHub에서 내려받거나 공개 검토 ZIP을 풀고 focus-cat-companion 폴더에서 실행하세요.

```sh
git clone https://github.com/b1ueseoyoung/focus-cat-companion.git
cd focus-cat-companion
```

```sh
claude --plugin-dir "$PWD"
```

이미 이 Mod를 불러온 세션에서는 `/reload-plugins`로 변경을 적용합니다. 검증한 호스트는 Claude Code 2.1.289입니다. 실행에 별도의 서버나 이미지 생성 서비스는 필요하지 않습니다.

| 명령 | 동작 |
| --- | --- |
| `/focus-cat character a` | 기본 고양이 A 선택 |
| `/focus-cat character b` | 고양이 B 선택 |
| `/focus-cat character status` | 현재 선택 확인 |
| `/focus-cat motion on` | 답변 보행과 정상 완료 춤 허용 |
| `/focus-cat motion off` | 움직임 정지; 춤 중에는 현재 자세 고정 |
| `/focus-cat start` | 타이머 시작 또는 재개 |
| `/focus-cat pause` | 타이머 일시정지 |
| `/focus-cat reset` | 현재 단계 시간 초기화; 완료 집중 수 유지 |
| `/focus-cat restart` | 현재 단계 초기화 후 시작 |
| `/focus-cat next` | 완료 집중 후 휴식 선택 또는 휴식 건너뛰기; 다음 단계는 수동 시작 |
| `/focus-cat show` / `hide` | 표시 / 숨김; 숨기면 타이머 일시정지 |
| `/focus-cat status` | 시간·단계·상태 확인 |

캐릭터 선택은 저장되며 타이머와 다른 설정을 유지합니다. 춤은 정상 답변 완료 이벤트에 자동 연결됩니다. 오류·취소·거절·승인 대기 완료에서는 시작하지 않으며 중복 완료와 재로드로 반복하지 않습니다. 새 답변이 시작되면 춤을 중단하고 보행합니다. motion off 후 다시 켜도 중단한 춤은 반복하지 않습니다. 유휴 상태에서는 고양이 애니메이션 시계를 사용하지 않습니다.

타이머 기본은 25/5/15분이며 집중 4회마다 긴 휴식입니다. 고양이 움직임과 타이머는 별도 상태입니다. 정상 종료 시 일시정지 저장하고 재실행 시 일시정지로 복구합니다. 호스트 시계가 10초 넘게 중단되면 일시정지합니다. 강제 종료는 마지막 저장 이후 시간을 잃을 수 있습니다.

높이가 4줄 미만 또는 폭이 8열 미만이면 시간만 표시합니다. 8~14열에서는 고양이만, 15열 이상에서는 시간도 표시합니다. Raster의 투명 픽셀은 터미널 기본 배경을 유지합니다. 화면에서 보이는 픽셀 비율은 터미널 글꼴에 따라 달라집니다.

미리보기: [PNG](preview/simulated-events-native-raster.png), [GIF](preview/simulated-events-native-raster.gif). 실제 Terminal의 공식 Raster에 **모의 이벤트를 표시한 화면**입니다. 실제 모델 턴의 촬영이나 검증이 아닙니다. GIF는 데모 전체를 반복하며 실제 완료 춤은 한 번만 재생합니다. **실제 모델 턴·도구 승인·OS 절전·Windows/Linux 네이티브 동작은 미검증**입니다. 자세한 검증 범위는 [VERIFICATION](docs/VERIFICATION.md)에 있습니다.

런타임에는 자산 로딩이나 Python이 필요 없습니다. 소스만 바꿨으면 다음으로 엔트리를 빌드합니다.

```sh
python3 scripts/build-module.py
```

픽셀 프레임 재생성은 Python과 Pillow 12.3.0을 사용합니다. 원본 32×32 PNG와 픽셀 그리드, 8×8 입력 샘플, 모든 프레임과 재생 메타데이터가 포함되어 있습니다.

```sh
python3 scripts/build-native-four-row-frames.py
python3 scripts/build-native-raster.py
python3 scripts/build-module.py
```

묶음 무결성 및 테스트:

```sh
python3 scripts/verify-release.py
claude plugin validate "$PWD" --strict --json
claude plugin test "$PWD"
bun test tests/reload.test.js tests/character-selection.test.js tests/pixel-core.test.js tests/dance-core.test.js
```

검사는 격리된 mock 호스트를 사용합니다. 실제 모델 프롬프트나 사용자 타이머 기록으로 테스트하지 않습니다. 생성되는 호스트 타입과 로컬 검사 출력은 배포물에 포함하지 않습니다.

픽셀과 프레임은 직접 작성한 정수 픽셀 편집물이며 sprite-gen·이미지 생성·외부 캐릭터 자산을 사용하지 않았습니다. [출처](docs/ASSET_PROVENANCE.md)와 [의존성](docs/DEPENDENCIES.md)을 참조하세요. 이 Mod는 모델과 reasoning effort를 선택하지 않습니다.

MIT · Copyright (c) 2026 이서영. [LICENSE](LICENSE). [GitHub 저장소](https://github.com/b1ueseoyoung/focus-cat-companion).
