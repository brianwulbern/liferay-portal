/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

package com.liferay.portal.kernel.test.util;

import com.liferay.portal.kernel.model.Role;
import com.liferay.portal.kernel.model.RoleConstants;
import com.liferay.portal.kernel.model.User;
import com.liferay.portal.kernel.service.RoleLocalService;
import com.liferay.portal.kernel.service.RoleLocalServiceUtil;
import com.liferay.portal.kernel.service.UserLocalService;
import com.liferay.portal.kernel.service.UserLocalServiceUtil;
import com.liferay.portal.kernel.test.TestInfo;
import com.liferay.portal.kernel.test.rule.AggregateTestRule;
import com.liferay.portal.kernel.util.comparator.UserIdComparator;
import com.liferay.portal.test.rule.LiferayUnitTestRule;

import java.util.Collections;

import org.junit.Assert;
import org.junit.ClassRule;
import org.junit.Rule;
import org.junit.Test;

import org.mockito.Mockito;

/**
 * @author Brian Wulbern
 */
public class UserTestUtilTest {

	@ClassRule
	@Rule
	public static final AggregateTestRule aggregateTestRule =
		LiferayUnitTestRule.INSTANCE;

	@Test
	@TestInfo("LPD-104198")
	public void testGetAdminUser() throws Exception {
		RoleLocalService roleLocalService = Mockito.mock(
			RoleLocalService.class);
		Role role = Mockito.mock(Role.class);

		long roleId = RandomTestUtil.randomLong();

		Mockito.when(
			role.getRoleId()
		).thenReturn(
			roleId
		);

		long companyId = RandomTestUtil.randomLong();

		Mockito.when(
			roleLocalService.getRole(companyId, RoleConstants.ADMINISTRATOR)
		).thenReturn(
			role
		);

		RoleLocalServiceUtil.setService(roleLocalService);

		UserLocalService userLocalService = Mockito.mock(
			UserLocalService.class);
		User user = Mockito.mock(User.class);

		Mockito.when(
			userLocalService.getRoleUsers(
				Mockito.eq(roleId), Mockito.eq(0), Mockito.eq(1),
				Mockito.argThat(
					orderByComparator ->
						(orderByComparator instanceof UserIdComparator) &&
						orderByComparator.isAscending()))
		).thenReturn(
			Collections.singletonList(user)
		);

		UserLocalServiceUtil.setService(userLocalService);

		Assert.assertSame(user, UserTestUtil.getAdminUser(companyId));
	}

}