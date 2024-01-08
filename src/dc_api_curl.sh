#!/bin/bash
# -*- coding: utf-8, tab-width: 2 -*-


function dc_api_curl () {
  local VERB="$1"; shift
  local SUB_URL="$1"; shift
  local OPT=(
    --silent
    --request "$VERB"
    --header 'Content-Type: application/vnd.api+json'
    )
  [ -z "${CFG[datacite_repo_user]}" ] || OPT+=(
    --user "${CFG[datacite_repo_user]}:${CFG[datacite_repo_pswd]}" )
  local FULL_URL="${CFG[datacite_api_server]}$SUB_URL"
  curl "${OPT[@]}" "$@" -- "$FULL_URL" || return $?
}






return 0
