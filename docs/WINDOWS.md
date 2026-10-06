# Windows에서 사용·검증하기

이 Mod는 Claude Code의 터미널 UI와 저장 API를 사용합니다. Windows용 별도 실행 파일은 없으며 같은 `hooks/register.js`를 불러옵니다. 개발을 수행한 대화형 환경은 macOS뿐입니다. **Windows Terminal에서 실제 모델 답변·승인·설정 재실행을 직접 확인하지 않았습니다.** 자동 검사와 아래 수동 검증을 구분하고, 검사 결과는 실행한 정확한 commit에 한해 해석하세요. 기존 검증 범위는 [VERIFICATION](VERIFICATION.md)을 참조하세요.

Windows 호환성 변경과 commit별 검사 결과는 [PR #7](https://github.com/b1ueseoyoung/focus-cat-companion/pull/7)에서 확인하세요. 아래 clone 명령은 `main`을 선택합니다. Git 없이 설치하려면 [main ZIP](https://github.com/b1ueseoyoung/focus-cat-companion/archive/refs/heads/main.zip)을 내려받아 풉니다.

공식 설치 문서 확인일: 2026-10-06. 호스트의 플랫폼 지원이 이 Mod의 실제 Windows 렌더링 검증을 대신하지는 않습니다.

## native Windows와 WSL

| 구분 | native Windows | WSL |
| --- | --- | --- |
| Windows Terminal 프로필 | PowerShell 또는 CMD | 설치된 Linux 배포판 |
| Claude Code 설치 | Windows용 installer 또는 WinGet | WSL 안에서 Linux용 installer |
| 저장소 경로 예 | `C:\Users\name\Projects\focus-cat-companion` | `/home/name/Projects/focus-cat-companion` |
| 실행 도구 | Windows의 `claude`, Python, Bun | 배포판 안의 Linux `claude`, Python, Bun |
| Git Bash | 선택 사항. Bash·Monitor 도구를 사용할 때 Git for Windows 필요 | Git for Windows 불필요 |
| Claude Code 명령 sandbox | native Windows 미지원 | WSL 2 지원, WSL 1 미지원 |

현재 [Claude Code 공식 안내](https://code.claude.com/docs/en/setup#set-up-on-windows)는 native Windows에서 Git for Windows 없이도 PowerShell 도구를 사용할 수 있다고 명시합니다. Git Bash가 설치되면 Bash 도구를 사용할 수 있습니다. 이 Mod 자체는 쉘이나 자식 프로세스를 실행하지 않습니다.

WSL에서는 Linux 파일 시스템에, PowerShell에서는 Windows 파일 시스템에 저장소를 두는 것이 [Microsoft 권장 방식](https://learn.microsoft.com/en-us/windows/wsl/filesystems)입니다. Windows의 `C:\...` 경로를 WSL 명령에 그대로 넘기지 마세요. native Windows와 WSL은 별도의 호스트 환경이므로 고양이 설정·타이머가 자동 공유된다고 가정하지 않습니다. 같은 파일을 동시에 편집하는 대신 환경별 checkout을 사용하세요.

## native Windows 준비와 실행

1. Windows Terminal을 준비합니다. Microsoft는 [Microsoft Store 설치](https://learn.microsoft.com/en-us/windows/terminal/install)를 권장하며, [공식 저장소](https://github.com/microsoft/terminal#installing-and-running-windows-terminal)는 Windows 10 2004/build 19041 이상을 요구합니다. Windows 11도 포함됩니다. WinGet을 이미 사용한다면 설치 명령은 `winget install --id Microsoft.WindowsTerminal -e`입니다. 기본 터미널·프로필 등 시스템 설정 변경은 이 Mod의 전제 조건이 아닙니다. Windows Terminal을 직접 열면 됩니다.
2. [Claude Code 공식 설치 안내](https://code.claude.com/docs/en/setup#install-claude-code)에 따라 Windows용 Claude Code를 준비합니다. PowerShell native installer는 아래와 같으며, 대안은 `winget install Anthropic.ClaudeCode`입니다. native installer는 자동 업데이트, WinGet 설치는 수동 업데이트가 기본입니다. 이 문서의 명령은 설치 방법 안내이며 개발 과정에서 Windows 시스템에 실행한 명령이 아닙니다.

   ```powershell
   irm https://claude.ai/install.ps1 | iex
   ```

3. 새 PowerShell 탭에서 `claude --version`과 `claude doctor`로 설치를 확인합니다. 이 Mod는 hooks module·Raster API를 사용하는 호스트가 필요합니다. 이 저장소의 [검증된 호스트 버전](DEPENDENCIES.md)을 함께 확인하세요. 명령이 없거나 API가 지원되지 않으면 설치/호스트 문제로 기록하고 렌더링 성공으로 처리하지 않습니다.
4. GitHub ZIP을 풀거나, Git이 이미 설치되어 있다면 다음으로 저장소를 내려받습니다.

   ```powershell
   git clone --branch main --single-branch https://github.com/b1ueseoyoung/focus-cat-companion.git
   Set-Location -LiteralPath '.\focus-cat-companion'
   $pluginDir = (Get-Location).Path
   claude --plugin-dir "$pluginDir"
   ```

`--plugin-dir`는 [공식 로컬 플러그인 로딩 방식](https://code.claude.com/docs/en/plugins)입니다. 공백·한글·대괄호가 있는 경로도 하나의 인수로 넘기도록 따옴표를 유지하세요. 다른 위치에 내려받았다면 `Set-Location -LiteralPath 'C:\Users\내 이름\Projects\focus-cat-companion'`처럼 실제 경로를 사용합니다. PowerShell에서는 Unix 명령 예시의 `$PWD` 대신 위의 문자열 `$pluginDir`를 사용합니다.

Git Bash를 사용하려는 경우에만 [공식 Windows 설정 안내](https://code.claude.com/docs/en/setup#set-up-on-windows)의 Git for Windows 설치·경로 탐지 절차를 따르세요. PowerShell 실행 정책 변경, 관리자 실행, 전역 코드 페이지 변경은 이 Mod가 요구하지 않습니다. 기존 Claude Code 접근 권한을 사용하며, 계정 추가·구독 구매는 이 절차에 포함하지 않습니다.

## 이미 준비된 WSL에서 실행

Windows Terminal에서 WSL 배포판 프로필을 열고 그 환경 안에서 실행합니다. WSL을 새로 활성화하거나 시스템 기능을 변경하는 절차는 이 문서 범위에 포함하지 않습니다. Claude Code가 없다면 [공식 Linux/WSL 설치 방법](https://code.claude.com/docs/en/setup#install-claude-code)은 `curl -fsSL https://claude.ai/install.sh | bash`입니다. 설치했다면 새 WSL 탭을 열어 아래 명령을 실행하세요.

```sh
cd ~
git clone --branch main --single-branch https://github.com/b1ueseoyoung/focus-cat-companion.git
cd focus-cat-companion
claude --version
claude --plugin-dir "$PWD"
```

WSL에서 Windows의 `claude.exe`를 우연히 호출하지 않는지 확인하세요. WSL 검증 결과는 native Windows 검증과 따로 기록합니다.

## 개발과 자동 검사

사용만 할 때는 Python, Bun, Pillow가 필요 없습니다. 자동 검사 도구는 Python 3.10 이상과 Bun을 사용하며 CI는 Bun 1.4.2를 사용합니다. [Python 공식 Windows 안내](https://docs.python.org/3/using/windows.html)와 [Bun 공식 설치 안내](https://bun.com/docs/installation)를 참고해 개발 도구를 미리 준비하세요. 아래 예시는 이미 설치된 Python 3를 `py -3`로 선택합니다. 해당 명령이 없다면 확인한 Python 3 실행 경로 또는 `python`으로 대체하세요.

저장소 루트의 PowerShell에서 실행합니다. 각 명령의 종료 코드가 0인지 확인한 뒤 다음 검사로 진행합니다.

```powershell
py -3 --version
bun --version
git rev-parse HEAD
py -3 scripts/check-platform.py
```

`check-platform.py`는 공백·한글·`#`가 있는 임시 경로에서 Python 회귀 검사, 배포 무결성, 모듈 재빌드 바이트 일치, 모든 독립 Bun `.test.js` 검사를 실행합니다. 기본 실행에는 Claude Code SDK 검사가 포함되지 않습니다. Claude Code가 설치된 같은 환경에서는 다음으로 엄격한 플러그인 검증과 공식 mock SDK 검사까지 실행합니다. 호스트가 없거나 기능을 지원하지 않으면 성공으로 건너뛰지 않고 실패합니다.

```powershell
py -3 scripts/check-platform.py --with-claude
```

소스 변경 후 모듈을 직접 빌드하거나 호스트 검사를 따로 실행할 때는 다음 명령을 사용합니다.

```powershell
py -3 scripts/build-module.py
$pluginDir = (Get-Location).Path
claude plugin validate "$pluginDir" --strict --json
claude plugin test "$pluginDir"
```

`.ts` 테스트의 `claude-code/testing`은 호스트가 제공하는 가상 모듈입니다. 전체 `tests` 폴더를 일반 `bun test`로 실행하는 대신 검사 스크립트가 독립 `.js` 검사와 호스트 검사를 나눕니다. 이 테스트들은 mock 이벤트·격리된 저장소를 사용하며 실제 모델 응답이나 Windows Terminal 픽셀을 관찰하지 않습니다. GitHub Actions의 Windows/Linux/macOS 행렬도 로그인과 실제 모델 요청 없이 자동 검사 범위만 확인합니다.

픽셀을 재생성할 때만 Pillow 12.3.0이 필요합니다. 별도 가상 환경에 설치하고 `build-native-four-row-frames.py`, `build-native-raster.py`, `build-module.py` 순서로 실행합니다. 가상 환경·검사 로그는 저장소 밖에 두세요. `verify-release.py`는 배포 파일 목록과 원본 바이트를 검사하므로 임의 파일을 저장소에 추가하거나 JSON/JS 파일을 다른 인코딩·줄바꿈으로 다시 저장하면 실패할 수 있습니다. 실패를 숨기려고 manifest를 갱신하지 말고 변경 원인을 확인합니다.

## 경로·인코딩·표시·저장 주의점

- 런타임은 자산 경로나 플랫폼별 홈 디렉터리를 직접 열지 않습니다. 픽셀은 모듈에 포함되며 타이머·선호 설정은 Claude Code 저장 API로 전달합니다. Windows 사용자 폴더나 레지스트리를 직접 수정하지 않습니다.
- 소스와 생성물은 UTF-8입니다. 터미널에서 한글이 깨지거나 픽셀 비율이 다르면 터미널·글꼴·호스트 버전을 기록하세요. 전역 로캘이나 코드 페이지를 바꿔야 한다고 가정하지 않습니다.
- A/B는 모두 8×8 픽셀을 터미널 4줄에 표시합니다. 실제 종횡비는 글꼴에 따라 달라집니다. 표시 영역이 높이 4줄 미만 또는 폭 8열 미만이면 시간만 표시하고, 폭 8~14열이면 고양이만 표시합니다.
- 캐릭터와 모션 선호 설정은 별도 키로 저장됩니다. 열린 다른 세션은 재로드 또는 세션 전환 후 최신 값을 읽습니다. 타이머는 세션별이므로 재실행 복구는 **같은 대화 세션을 재개하여** 확인하세요. 정상 종료 후에는 일시정지로 복구하며 강제 종료는 마지막 저장 이후 시간을 잃을 수 있습니다.

## Windows 수동 smoke 체크리스트 — 아직 미실행

아래 항목은 Windows Terminal에서 실제 Claude Code를 열어 확인할 때만 체크합니다. native Windows와 WSL 각각 별도 기록을 남기고, commit SHA, OS/build·CPU, Windows Terminal 버전, 프로필/쉘, Claude Code 버전, 경로, 사용 글꼴을 함께 적습니다. 실제 모델 요청은 기존 승인된 계정에서 수행하며 사용량이 발생할 수 있습니다.

- [ ] 공백·한글 경로에서 `--plugin-dir` 로딩에 성공하고 `/focus-cat status`가 응답한다. 시작만으로 타이머가 진행되지 않는다.
- [ ] `/focus-cat character a`와 `b` 각각에서 고양이가 4줄로 표시되고 투명 배경, 방향 전환, 입력창·출력 영역이 정상이다. 좁은 창/분할 창에서 넘침이나 잔상이 없다.
- [ ] `/focus-cat motion on` 후 **실제 모델 답변 대기·생성 중** 걷고, 정상 완료 뒤 8프레임·960ms 춤을 한 번 재생한 다음 멈춘다. 캡처 시 모의 이벤트와 구분한다.
- [ ] 실제 도구 승인 창을 띄워 대기 중 정지한다. 허용/거절 후 도구가 끝나면 대기가 해제된다. 공개 수동 승인 결정 이벤트가 없는 경우 허용 버튼을 누른 즉시가 아닌 도구 완료 때 재개하는 것이 기존 동작이다.
- [ ] 취소·오류·거절 완료에서 춤이 시작되지 않는다. 답변 도중 `/reload-plugins`를 실행해도 고양이가 중복 표시되거나 완료 춤이 반복되지 않는다.
- [ ] `/focus-cat motion off`에서 걷기와 춤이 멈춘다. 춤 중 off/on으로 중단한 춤이 다시 시작되지 않는다.
- [ ] B와 motion off를 선택하고 정상 종료한 뒤 재실행해 설정이 유지된다. 두 세션에서 캐릭터·모션을 각각 바꾼 뒤 재로드해 서로 덮어쓰지 않는지 확인한다. 기존 설정은 검사 후 원래 값으로 복구한다.
- [ ] 테스트용 대화에서 타이머 start/pause/reset/hide/show가 동작하고, 정상 종료 후 **같은 대화를 재개**했을 때 일시정지 상태와 남은 시간이 복구된다. 실제 사용자 타이머 기록은 검사에 사용하지 않는다.
- [ ] 10초를 넘는 호스트 시계 중단/절전 복귀 후 타이머가 일시정지한다. 강제 종료 복구는 별도 항목으로 마지막 저장 시점의 한계를 기록한다.

자동 CI가 Windows에서 통과하더라도 이 수동 목록, 실제 모델 이벤트 타이밍, 네이티브 승인 창, 절전·복귀 검증을 완료한 것으로 표시하지 않습니다.
