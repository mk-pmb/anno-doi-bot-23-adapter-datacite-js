// -*- coding: utf-8, tab-width: 2 -*-

import 'p-fatal';
import 'usnam-pmb';

import arrayOfTruths from 'array-of-truths';
import guessSubjectTargets from 'webanno-guess-subject-target-url-pmb';
import mustBe from 'typechecks-pmb/must-be.js';
import objPop from 'objpop';

import fmtDateAttrs from './fmtDateAttrs.mjs';
import kisi from './kisi.mjs';
import parseBodies from './parseBodies.mjs';
import readOneStdinRecord from './readOneStdinRecord.mjs';
import rightsListDb from './rightsListDb.mjs';
import transformAuthor from './transformAuthor.mjs';


const EX = {

  async nodemjsCliMain() {
    const anno = await readOneStdinRecord();
    const mustEnv = mustBe.tProp('env var ', process.env);
    const cfg = {
      expectedDoi: mustEnv.nest('anno_doi_expect'),
      initialVersionDate: mustEnv('str | undef', 'anno_initial_version_date'),
    };
    console.log(JSON.stringify(EX.convert(cfg, anno), null, 2));
  },


  convert(cfg, anno) {
    const popAnno = objPop(anno, { mustBe }).mustBe;
    const annoIdUrl = popAnno.nest('id');
    const { versNum } = EX.parseVersId(annoIdUrl);
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
      doi: cfg.expectedDoi,
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
      relationLinks,
    } = parseBodies(popAnno);
    const firstBodyLanguage = (textBodyLanguages[0] || null);
    attr.language = (popAnno('undef | str', 'dc:language')
      || firstBodyLanguage
      || ':unav');  // DataCite: "value unavailable, possibly unknown"

    attr.subjects = [
      ...gndSubjects,
    ];

    const subjRelations = subjectTargets.map(st => ({
      resourceTypeGeneral: 'Text',
      // ^- Currently, all our annotations are texts.
      relationType: 'Reviews',
      // ^- The annotation "reviews" the target, as per definition in the
      //    DataCite Metadata Kernel v4.4.
      relatedIdentifierType: 'URL',
      relatedIdentifier: (st.scope || st.source || st.id || st),
    }));

    attr.relatedIdentifier = [
      ...subjRelations,
      ...relationLinks,
    ];

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
