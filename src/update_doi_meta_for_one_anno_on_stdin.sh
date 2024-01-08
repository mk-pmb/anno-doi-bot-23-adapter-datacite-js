#!/bin/bash
# -*- coding: utf-8, tab-width: 2 -*-


function update_doi_meta_for_one_anno_on_stdin () {
  local DC_META_JSON="$( env_export_anno_cfg env \
    nodemjs "$DBA_PATH"/src/annoToDataciteDoi.mjs)"
  [ -n "$DC_META_JSON" ] || return 5$(
    echo 'E: Failed to convert anno to DataCite API format.' >&2)

  local WANT_DOI='"doi":\s*"[^\s"]+"'
  WANT_DOI="$(<<<"$DC_META_JSON" grep -oPe "$WANT_DOI" | cut -sd $'\x22' -f 4)"
  case "$WANT_DOI" in
    '' )
      echo 'E: Found no "doi": key in' "$JSON_FILE" >&2
      return 8;;
    *$'\n'* )
      echo 'E: Found too many "doi": keys in' "$JSON_FILE" >&2
      return 8;;
  esac

  local DC_REPLY= DC_RV= # pre-declare
  DC_REPLY="$(dc_api_curl PUT dois/"$WANT_DOI" --data '@-' <<<"$DC_META_JSON")"
  DC_RV=$?
  [ "$DC_RV" == 0 ] || return 8$(echo "E: API request error, rv=$DC_RC" >&2)
  <<<"$DC_REPLY" nodemjs "$DBA_PATH"/src/interpretDcApiResult.mjs || return $?
}










return 0
