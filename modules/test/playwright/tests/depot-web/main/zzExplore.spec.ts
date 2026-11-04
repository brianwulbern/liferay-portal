import {expect, mergeTests} from '@playwright/test';
import {createReadStream, writeFileSync} from 'fs';
import path from 'path';

import {dataApiHelpersTest} from '../../../fixtures/dataApiHelpersTest';
import {isolatedSiteTest} from '../../../fixtures/isolatedSiteTest';
import {loginTest} from '../../../fixtures/loginTest';
import getRandomString from '../../../utils/getRandomString';
import {WorkflowTasksPage} from '../../../pages/portal-workflow-task-web/WorkflowTasksPage';
import {PORTLET_URLS} from '../../../utils/portletUrls';
import getBasicWebContentStructureId from '../../../utils/structured-content/getBasicWebContentStructureId';
import addEditableDepot from './utils/addEditableDepot';
import {BlogsEditBlogEntryPage} from '../../blogs-web/main/pages/BlogsEditBlogEntryPage';
import {journalPagesTest} from '../../journal-web/main/fixtures/journalPagesTest';
import getDataStructureDefinition from '../../journal-web/main/utils/getDataStructureDefinition';

const test = mergeTests(dataApiHelpersTest, isolatedSiteTest, journalPagesTest, loginTest());

const OUT = '/tmp/claude-1000/-home-me-dev-projects-liferay-portal/6fe80e05-63c4-490d-b317-a3a110c8ac7f/scratchpad/depotworkflow/explore';

async function dump(page, name, frame?) {
	const target = frame ? frame.locator('body') : page.locator('body');
	writeFileSync(`${OUT}/${name}.txt`, await target.ariaSnapshot());
	await page.screenshot({fullPage: true, path: `${OUT}/${name}.png`});
}

test('explore', async ({apiHelpers, journalEditArticlePage, page, site}) => {
	test.setTimeout(300000);

	const depot = await addEditableDepot(apiHelpers);

	await apiHelpers.headlessAssetLibrary.connectSite(
		depot.externalReferenceCode,
		site.externalReferenceCode
	);

	const wd = await apiHelpers.headlessAdminWorkflow.getWorkflowDefinitionByName('Single Approver');

	for (const className of [
		'com.liferay.journal.model.JournalArticle',
		'com.liferay.document.library.kernel.model.DLFolder',
	]) {
		console.log(JSON.stringify(await apiHelpers.headlessAdminWorkflow.postWorkflowDefinitionLink(
			className, depot.groupId, wd.id, wd.name, Number(wd.version))));
	}

	const folder = await apiHelpers.headlessDelivery.postDocumentFolder(depot.groupId, {name: 'DMF' + getRandomString()});

	const doc = await apiHelpers.headlessDelivery.postDocumentFolderDocument(folder.id,
		createReadStream(path.join(__dirname, 'dependencies/Document.jpg')),
		{fileName: 'img.jpg', title: 'IMG' + getRandomString()});

	const fv = await apiHelpers.jsonWebServicesDocumentLibrary.getLastestFileVersion(String(doc.id));
	console.log('DM status', fv.status);

	const wcFolder = await apiHelpers.jsonWebServicesJournal.addFolder({groupId: depot.groupId, name: 'WCF' + getRandomString()});

	const wc = await apiHelpers.jsonWebServicesJournal.addWebContent({
		ddmStructureId: await getBasicWebContentStructureId(apiHelpers),
		folderId: wcFolder.folderId,
		groupId: depot.groupId,
		titleMap: {en_US: 'WC' + getRandomString()},
	});
	console.log('WC status', wc.status, wc.articleId, wc.id, wc.resourcePrimKey);

	const wtp = new WorkflowTasksPage(page);
	for (const title of [doc.title, wc.titleMap ? Object.values(wc.titleMap)[0] : '']) {
		console.log('title', title);
	}
	const wcTitle = await page.evaluate(() => 1);
	await wtp.goToAssignedToMyRoles();
	await wtp.assignToMe(doc.title);
	await wtp.reject(doc.title);
	await wtp.goto();
	await page.waitForTimeout(2000);
	await dump(page, '40-assigned-to-me');
	const row = page.getByRole('row').filter({hasText: doc.title}).filter({hasText: 'Update'});
	await row.getByRole('link', {name: doc.title}).click();
	await page.waitForTimeout(3000);
	await dump(page, '41-update-task');
	await page.locator('[title="Edit"]').first().click();
	await page.waitForTimeout(4000);
	await dump(page, '42-doc-edit');
});
