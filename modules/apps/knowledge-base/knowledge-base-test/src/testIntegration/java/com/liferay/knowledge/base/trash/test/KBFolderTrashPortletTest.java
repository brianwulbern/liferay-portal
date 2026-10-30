/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

package com.liferay.knowledge.base.trash.test;

import com.liferay.arquillian.extension.junit.bridge.junit.Arquillian;
import com.liferay.knowledge.base.model.KBFolder;
import com.liferay.knowledge.base.service.KBFolderLocalService;
import com.liferay.knowledge.base.test.util.KBTestUtil;
import com.liferay.portal.kernel.model.Group;
import com.liferay.portal.kernel.security.auth.PrincipalException;
import com.liferay.portal.kernel.security.permission.PermissionCheckerFactoryUtil;
import com.liferay.portal.kernel.test.ReflectionTestUtil;
import com.liferay.portal.kernel.test.TestInfo;
import com.liferay.portal.kernel.test.portlet.MockLiferayPortletRenderRequest;
import com.liferay.portal.kernel.test.rule.AggregateTestRule;
import com.liferay.portal.kernel.test.rule.DeleteAfterTestRun;
import com.liferay.portal.kernel.test.util.GroupTestUtil;
import com.liferay.portal.kernel.test.util.TestPropsValues;
import com.liferay.portal.kernel.theme.ThemeDisplay;
import com.liferay.portal.kernel.util.WebKeys;
import com.liferay.portal.test.rule.Inject;
import com.liferay.portal.test.rule.LiferayIntegrationTestRule;
import com.liferay.trash.constants.TrashPortletKeys;
import com.liferay.trash.model.TrashEntry;
import com.liferay.trash.service.TrashEntryLocalService;

import jakarta.portlet.Portlet;
import jakarta.portlet.RenderRequest;

import org.junit.Assert;
import org.junit.Before;
import org.junit.ClassRule;
import org.junit.Rule;
import org.junit.Test;
import org.junit.runner.RunWith;

/**
 * @author Brian Wulbern
 */
@RunWith(Arquillian.class)
public class KBFolderTrashPortletTest {

	@ClassRule
	@Rule
	public static final AggregateTestRule aggregateTestRule =
		new LiferayIntegrationTestRule();

	@Before
	public void setUp() throws Exception {
		_group = GroupTestUtil.addGroup();
	}

	@Test
	@TestInfo("LPD-107894")
	public void testCheckPermissions() throws Exception {
		ReflectionTestUtil.invoke(
			_portlet, "_checkPermissions", new Class<?>[] {RenderRequest.class},
			_getMockLiferayPortletRenderRequest(
				_group.getGroupId(), _addKBFolderTrashEntry()));
	}

	@Test
	@TestInfo("LPD-107894")
	public void testCheckPermissionsWithAnotherScopeGroup() throws Exception {
		TrashEntry trashEntry = _addKBFolderTrashEntry();

		_otherGroup = GroupTestUtil.addGroup();

		try {
			ReflectionTestUtil.invoke(
				_portlet, "_checkPermissions",
				new Class<?>[] {RenderRequest.class},
				_getMockLiferayPortletRenderRequest(
					_otherGroup.getGroupId(), trashEntry));

			Assert.fail();
		}
		catch (Exception exception) {
			Assert.assertTrue(
				exception instanceof PrincipalException.MustHavePermission);
		}
	}

	private TrashEntry _addKBFolderTrashEntry() throws Exception {
		KBFolder kbFolder = KBTestUtil.addKBFolder(_group.getGroupId());

		_kbFolderLocalService.moveKBFolderToTrash(
			TestPropsValues.getUserId(), kbFolder.getKbFolderId());

		return _trashEntryLocalService.getEntry(
			KBFolder.class.getName(), kbFolder.getKbFolderId());
	}

	private MockLiferayPortletRenderRequest _getMockLiferayPortletRenderRequest(
			long scopeGroupId, TrashEntry trashEntry)
		throws Exception {

		MockLiferayPortletRenderRequest mockLiferayPortletRenderRequest =
			new MockLiferayPortletRenderRequest();

		mockLiferayPortletRenderRequest.setParameter(
			"trashEntryId", String.valueOf(trashEntry.getEntryId()));

		ThemeDisplay themeDisplay = new ThemeDisplay();

		themeDisplay.setPermissionChecker(
			PermissionCheckerFactoryUtil.create(TestPropsValues.getUser()));
		themeDisplay.setScopeGroupId(scopeGroupId);
		themeDisplay.setUser(TestPropsValues.getUser());

		mockLiferayPortletRenderRequest.setAttribute(
			WebKeys.THEME_DISPLAY, themeDisplay);

		return mockLiferayPortletRenderRequest;
	}

	@DeleteAfterTestRun
	private Group _group;

	@Inject
	private KBFolderLocalService _kbFolderLocalService;

	@DeleteAfterTestRun
	private Group _otherGroup;

	@Inject(filter = "jakarta.portlet.name=" + TrashPortletKeys.TRASH)
	private Portlet _portlet;

	@Inject
	private TrashEntryLocalService _trashEntryLocalService;

}