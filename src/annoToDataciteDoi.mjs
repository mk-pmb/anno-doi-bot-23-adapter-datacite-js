// -*- coding: utf-8, tab-width: 2 -*-

import 'p-fatal';
import 'usnam-pmb';

import arrayOfTruths from 'array-of-truths';
import guessSubjectTargets from 'webanno-guess-subject-target-url-pmb';
import mustBe from 'typechecks-pmb/must-be.js';
import objPop from 'objpop';
import readRelaxedJsonFromStdin from 'read-relaxed-json-from-stdin-pmb';

import fmtDateAttrs from './fmtDateAttrs.mjs';
import kisi from './kisi.mjs';
import parseBodies from './parseBodies.mjs';
import rightsListDb from './rightsListDb.mjs';
import transformAuthor from './transformAuthor.mjs';


const EX = {

  async nodemjsCliMain() {
    const mustEnv = mustBe.tProp('env var ', process.env);
    const input = await readRelaxedJsonFromStdin();
    mustBe('pos num', 'Number of input records')(input.length);
    const anno = mustBe('obj', 'Input record #1 (the annotation)')(input[0]);
    const cfg = {
      doiPrefix: mustEnv.nest('cfg_doi_prefix'),
      initialVersionDate: mustEnv('str | undef', 'anno_initial_version_date'),
    };
    console.log(JSON.stringify(EX.convert(cfg, anno), null, 2));
  },


  convert(cfg, anno) {
    const popAnno = objPop(anno, { mustBe }).mustBe;
    const annoIdUrl = popAnno.nest('id');
    const { baseId, versNum } = EX.parseVersId(annoIdUrl);
    const prevReviUrl = popAnno('nonEmpty str | undef', 'dc:replaces');
    const hasPreviousVersion = Boolean(prevReviUrl);

    const subjectTargets = guessSubjectTargets.multi(anno);
    if (subjectTargets.length < 1) {
      throw new Error('Expected at least one subject target!');
    }

    const attr = {
      schemaVersion: 'http://datacite.org/schema/kernel-4.4',
      url: annoIdUrl,
      version: versNum,
      doi: cfg.doiPrefix + baseId + '_' + versNum,
      ...fmtDateAttrs(popAnno, { ...cfg, hasPreviousVersion }),
      types: {
        resourceType: 'Annotation',
        resourceTypeGeneral: 'Other',
      },
    };

    (function altIds() {
      const a = 'alternateIdentifier';
      attr[a + 's'] = [{ [a + 'Type']: 'URL', [a]: annoIdUrl }];
    }());

    const dataCiteDoiRec = {
      data: {
        type: 'dois',
        attributes: attr,
      },
    };

    attr.creators = kisi.popMapList(popAnno, 'creator', transformAuthor);

    const {
      gndSubjects,
      textBodyLanguages,
    } = parseBodies(popAnno);
    const firstBodyLanguage = (textBodyLanguages[0] || null);
    attr.language = firstBodyLanguage;

    attr.subjects = [
      ...gndSubjects,
    ];

    attr.relatedIdentifier = subjectTargets.map(st => ({
      resourceTypeGeneral: 'Text',
      // ^- Currently, all our annotations are texts.
      relationType: 'Reviews',
      // ^- The annotation "reviews" the target, as per definition in the
      //    DataCite Metadata Kernel v4.4.
      relatedIdentifierType: 'URL',
      relatedIdentifier: (st.scope || st.source || st.id || st),
    }));

    attr.titles = [
      { title: popAnno.nest('dc:title'), lang: firstBodyLanguage },
    ];

    attr.rightsList = arrayOfTruths(anno.rights).map((licenseUrl) => {
      const found = rightsListDb.byUrl(licenseUrl);
      if (found) { return found; }
      throw new Error('Missing license meta data for: ' + licenseUrl);
    });

    return dataCiteDoiRec;
  },


  parseVersId(url) {
    const versId = String(url || '').split('/').slice(-1)[0];
    let versNum = 1;
    const baseId = versId.replace(/~(\d+)$/, function found(m, v) {
      versNum = +(m && v);
      return '';
    });
    return { versId, baseId, versNum };
  },

};


export default EX;
