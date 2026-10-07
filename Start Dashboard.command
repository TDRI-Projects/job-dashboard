#!/bin/zsh
cd -- "${0:A:h}" || exit 1
if ! command -v python3 >/dev/null 2>&1; then
  print "Python 3 is required to start the dashboard."
  print "Press Return to close this window."
  read
  exit 1
fi
python3 ./start_dashboard.py "$@"
result=$?
if (( result != 0 )); then
  print "Press Return to close this window."
  read
fi
exit "$result"
