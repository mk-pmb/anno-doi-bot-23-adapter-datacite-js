#!/bin/bash
# -*- coding: utf-8, tab-width: 2 -*-


function update_doi_meta_for_one_anno_on_stdin () {
  local DC_META_JSON="$( env_export_anno_cfg env \
    nodemjs "$DBA_PATH"/src/annoToDataciteDoi.mjs)"
  [ -n "$DC_META_JSON" ] || return 5$(
    echo 'E: Failed to convert anno to DataCite API format.' >&2)

  local DOI='"doi":\s*"[^\s"]+"'
  DOI="$(<<<"$DC_META_JSON" grep -oPe "$DOI" | cut -sd $'\x22' -f 4)"
  case "$DOI" in
    '' )
      echo 'E: Found no "doi": key in' "$JSON_FILE" >&2
      return 8;;
    *$'\n'* )
      echo 'E: Found too many "doi": keys in' "$JSON_FILE" >&2
      return 8;;
  esac

  local DC_REPLY= DC_RV= # pre-declare
  DC_REPLY="$(dc_api_curl PUT dois/"$DOI" --data '@-' <<<"$DC_META_JSON")"
  DC_RV=$?
  nl -ba <<<"$DC_REPLY"
  unset DC_REPLY
  local -p
}









return 0
