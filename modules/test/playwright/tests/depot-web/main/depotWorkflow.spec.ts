/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {Page, expect, mergeTests} from '@playwright/test';
import {createReadStream} from 'fs';
import path from 'path';

import {dataApiHelpersTest} from '../../../fixtures/dataApiHelpersTest';
import {isolatedSiteTest} from '../../../fixtures/isolatedSiteTest';
import {loginTest} from '../../../fixtures/loginTest';
import {workflowPagesTest} from '../../../fixtures/workflowPagesTest';
import {DataApiHelpers} from '../../../helpers/ApiHelpers';
import getRandomString from '../../../utils/getRandomString';
import {performUserSwitch, userData} from '../../../utils/performLogin';
import {PORTLET_URLS} from '../../../utils/portletUrls';
import getBasicWebContentStructureId from '../../../utils/structured-content/getBasicWebContentStructureId';
import {BlogsEditBlogEntryPage} from '../../blogs-web/main/pages/BlogsEditBlogEntryPage';
import {journalPagesTest} from '../../journal-web/main/fixtures/journalPagesTest';
import getDataStructureDefinition from '../../journal-web/main/utils/getDataStructureDefinition';
import {depotsPagesTest} from './fixtures/depotsPagesTest';
import addEditableDepot from './utils/addEditableDepot';

const test = mergeTests(
	dataApiHelpersTest,
	depotsPagesTest,
	isolatedSiteTest,
	journalPagesTest,
	loginTest(),
	workflowPagesTest
);

const DL_FOLDER_CLASS_NAME =
	'com.liferay.document.library.kernel.model.DLFolder';

const DL_NAMESPACE = '_com_liferay_document_library_web_portlet_DLAdminPortlet_';

const JOURNAL_ARTICLE_CLASS_NAME = 'com.liferay.journal.model.JournalArticle';

const JOURNAL_NAMESPACE = '_com_liferay_journal_web_portlet_JournalPortlet_';

async function addConnectedDepot(apiHelpers: DataApiHelpers, site: Site) {
	const depot = await addEditableDepot(apiHelpers);

	await apiHelpers.headlessAssetLibrary.connectSite(
		depot.externalReferenceCode,
		site.externalReferenceCode
	);

	return depot;
}

async function enableWorkflow(
	apiHelpers: DataApiHelpers,
	className: string,
	groupId: number
) {
	const workflowDefinition =
		await apiHelpers.headlessAdminWorkflow.getWorkflowDefinitionByName(
			'Single Approver'
		);

	await apiHelpers.headlessAdminWorkflow.postWorkflowDefinitionLink(
		className,
		groupId,
		workflowDefinition.id,
		workflowDefinition.name,
		Number(workflowDefinition.version)
	);
}

async function expectDocumentStatus(
	page: Page,
	depotEntryId: string,
	folderId: number,
	title: string,
	status: string
) {
	await page.goto(
		`/group/asset-library-${depotEntryId}${PORTLET_URLS.documentLibrary}&${DL_NAMESPACE}mvcRenderCommandName=%2Fdocument_library%2Fview_folder&${DL_NAMESPACE}folderId=${folderId}`
	);

	await expect(
		page.locator('.card').filter({hasText: title}).locator('.label')
	).toHaveText(status);
}

async function addWebContentStructure(apiHelpers: DataApiHelpers, site: Site) {
	const structureName = getRandomString();

	await apiHelpers.dataEngine.createStructure(
		site.id,
		getDataStructureDefinition({
			defaultLanguageId: 'en_US',
			fields: [{fieldType: 'journal_article', name: 'WebContent'}],
			name: structureName,
		})
	);

	return structureName;
}

async function expectWebContentStatus(
	page: Page,
	groupURL: string,
	folderId: number,
	title: string,
	status: string
) {
	await page.goto(
		`/group${groupURL}${PORTLET_URLS.journal}&${JOURNAL_NAMESPACE}folderId=${folderId}`
	);

	await expect(getWebContentStatus(page, title)).toHaveText(status);
}

function getWebContentStatus(page: Page, title: string) {
	return page
		.locator('.list-group-item')
		.filter({hasText: title})
		.locator('.label');
}

test(
	'A pending depot image is selectable in a connected site only after approval',
	{tag: '@LPD-110541'},
	async ({
		apiHelpers,
		depotItemSelectorPage,
		page,
		site,
		workflowTasksPage,
	}) => {
		const depot = await addConnectedDepot(apiHelpers, site);

		await enableWorkflow(apiHelpers, DL_FOLDER_CLASS_NAME, depot.groupId);

		const folder = await apiHelpers.headlessDelivery.postDocumentFolder(
			depot.groupId
		);

		const title = getRandomString();

		await apiHelpers.headlessDelivery.postDocumentFolderDocument(
			folder.id,
			createReadStream(path.join(__dirname, 'dependencies/Document.jpg')),
			{fileName: `${title}.jpg`, title}
		);

		await expectDocumentStatus(
			page,
			depot.depotEntryId,
			folder.id,
			title,
			'Pending'
		);

		const blogsEditBlogEntryPage = new BlogsEditBlogEntryPage(page);

		const openImageSelector = async () => {
			await blogsEditBlogEntryPage.goto(site.friendlyUrlPath);

			await page
				.getByRole('button', {name: 'Select File'})
				.first()
				.click();

			const itemSelector =
				depotItemSelectorPage.getItemSelector('Select File');

			await itemSelector
				.getByRole('link', {name: 'Documents and Media'})
				.click();

			await depotItemSelectorPage.openDepotFolder({
				depotName: depot.name,
				folderName: folder.name,
				itemSelector,
			});

			return itemSelector;
		};

		// The pending image is not offered in the connected site

		let itemSelector = await openImageSelector();

		await expect(
			itemSelector.getByText(
				'There are no documents or media files in this folder.'
			)
		).toBeVisible();

		await expect(itemSelector.getByText(title)).toHaveCount(0);

		// Approve the image

		await workflowTasksPage.goToAssignedToMyRoles();

		await workflowTasksPage.assignToMe(title);

		await workflowTasksPage.approve(title);

		await expectDocumentStatus(
			page,
			depot.depotEntryId,
			folder.id,
			title,
			'Approved'
		);

		// The approved image can be selected in the connected site

		itemSelector = await openImageSelector();

		await itemSelector.getByText(title, {exact: true}).click();

		await expect(page.locator('.image-wrapper img')).toHaveAttribute(
			'src',
			new RegExp(title)
		);
	}
);

for (const inFolder of [false, true]) {
	test(
		`A pending depot web content ${inFolder ? 'in a folder ' : ''}is selectable in a connected site only after approval`,
		{tag: '@LPD-110541'},
		async ({
			apiHelpers,
			depotItemSelectorPage,
			journalEditArticlePage,
			page,
			site,
			workflowTasksPage,
		}) => {
			const depot = await addConnectedDepot(apiHelpers, site);

			await enableWorkflow(
				apiHelpers,
				JOURNAL_ARTICLE_CLASS_NAME,
				depot.groupId
			);

			const folder = inFolder
				? await apiHelpers.jsonWebServicesJournal.addFolder({
						groupId: depot.groupId,
					})
				: null;

			const folderId = folder ? folder.folderId : 0;

			const title = getRandomString();

			await apiHelpers.jsonWebServicesJournal.addWebContent({
				ddmStructureId: await getBasicWebContentStructureId(apiHelpers),
				folderId,
				groupId: depot.groupId,
				titleMap: {en_US: title},
			});

			await expectWebContentStatus(
				page,
				`/asset-library-${depot.depotEntryId}`,
				folderId,
				title,
				'Pending'
			);

			const structureName = await addWebContentStructure(
				apiHelpers,
				site
			);

			const openWebContentSelector = async () => {
				await journalEditArticlePage.goto({
					siteUrl: site.friendlyUrlPath,
					structureName,
				});

				await page
					.getByTestId('WebContent')
					.getByRole('button', {name: 'Select'})
					.click();

				const itemSelector =
					depotItemSelectorPage.getItemSelector('Web Content');

				await depotItemSelectorPage.openDepotFolder({
					depotName: depot.name,
					folderName: folder?.name,
					itemSelector,
				});

				return itemSelector;
			};

			// The pending web content is not offered in the connected site

			let itemSelector = await openWebContentSelector();

			await expect(
				itemSelector.getByText('No web content was found.')
			).toBeVisible();

			await expect(itemSelector.getByText(title)).toHaveCount(0);

			// Approve the web content

			await workflowTasksPage.goToAssignedToMyRoles();

			await workflowTasksPage.assignToMe(title);

			await workflowTasksPage.approve(title);

			await expectWebContentStatus(
				page,
				`/asset-library-${depot.depotEntryId}`,
				folderId,
				title,
				'Approved'
			);

			// The approved web content can be referenced from the connected site

			itemSelector = await openWebContentSelector();

			await itemSelector.getByText(title, {exact: true}).click();

			await expect(
				page.getByTestId('WebContent').getByRole('textbox')
			).toHaveValue(title);

			const siteTitle = getRandomString();

			await journalEditArticlePage.fillTitle(siteTitle);

			await journalEditArticlePage.publishArticle(true);

			await expect(getWebContentStatus(page, siteTitle)).toHaveText(
				'Approved'
			);
		}
	);
}

for (const {action, status, tag} of [
	{action: 'approve', status: 'Approved', tag: ['@LPD-110541', '@LPS-113392']},
	{action: 'reject', status: 'Pending', tag: '@LPD-110541'},
]) {
	test(
		`A depot content reviewer can ${action} a depot web content`,
		{tag},
		async ({apiHelpers, page, workflowTasksPage}) => {
			const depot = await addEditableDepot(apiHelpers);

			const user = await apiHelpers.headlessAdminUser.postUserAccount();

			userData[user.alternateName] = {
				name: user.givenName,
				password: 'test',
				surname: user.familyName,
			};

			await apiHelpers.jsonWebServicesUser.agreeToTermsOfUse(user.id);
			await apiHelpers.jsonWebServicesUser.answerReminderQuery(user.id);

			await apiHelpers.headlessAssetLibrary.putAssetLibraryUserAccount(
				depot.externalReferenceCode,
				user.externalReferenceCode
			);

			await apiHelpers.headlessAssetLibrary.putAssetLibraryUserAccountRoles(
				depot.externalReferenceCode,
				user.externalReferenceCode,
				['Asset Library Content Reviewer']
			);

			await enableWorkflow(
				apiHelpers,
				JOURNAL_ARTICLE_CLASS_NAME,
				depot.groupId
			);

			const title = getRandomString();

			await apiHelpers.jsonWebServicesJournal.addWebContent({
				ddmStructureId: await getBasicWebContentStructureId(apiHelpers),
				groupId: depot.groupId,
				titleMap: {en_US: title},
			});

			const depotURL = `/asset-library-${depot.depotEntryId}`;

			await expectWebContentStatus(page, depotURL, 0, title, 'Pending');

			// The review task reaches the content reviewer role

			await performUserSwitch(page, user.alternateName);

			await workflowTasksPage.goToAssignedToMyRoles();

			await expect(
				page.getByRole('row').filter({hasText: title})
			).toBeVisible();

			// The administrator assigns the task to the content reviewer

			await performUserSwitch(page, 'test');

			await workflowTasksPage.goToAssignedToMyRoles();

			await workflowTasksPage.assignToUser(title, user);

			// The content reviewer completes the task

			await performUserSwitch(page, user.alternateName);

			await workflowTasksPage.goto();

			await workflowTasksPage[action](title);

			await performUserSwitch(page, 'test');

			await expectWebContentStatus(page, depotURL, 0, title, status);
		}
	);
}
