/*
 * Vencord, a modification for Discord's desktop app
 * Copyright (c) 2023 Vendicated and contributors
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
*/

import { definePluginSettings, Settings } from "@api/settings";
import { Link } from "@components/Link";
import { Devs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";
import { filters, mapMangledModuleLazy } from "@webpack";
import { FluxDispatcher, Forms } from "@webpack/common";

// START yoinked from lastfm.tsx
const assetManager = mapMangledModuleLazy(
    "getAssetImage: size must === [number, number] for Twitch",
    {
        getAsset: filters.byCode("apply("),
    }
);

async function getApplicationAsset(key: string): Promise<string> {
    return (await assetManager.getAsset(Settings.plugins.customRPC.appID, [key, undefined]))[0];
}

interface ActivityAssets {
    large_image?: string;
    large_text?: string;
    small_image?: string;
    small_text?: string;
}

interface Activity {
    state: string;
    details?: string;
    timestamps?: {
        start?: Number;
        end?: Number;
    };
    assets?: ActivityAssets;
    buttons?: Array<string>;
    name: string;
    application_id: string;
    metadata?: {
        button_urls?: Array<string>;
    };
    type: Number;
    flags: Number;
}
// END

const strOpt = (description: string) => ({
    type: OptionType.STRING,
    description,
    onChange: setRpc
}) as const;

const numOpt = (description: string) => ({
    type: OptionType.NUMBER,
    description,
    onChange: setRpc
}) as const;


const settings = definePluginSettings({
    appID: strOpt("The ID of the application for the rich presence."),
    appName: strOpt("The name of the presence."),
    details: strOpt("Line 1 of rich presence."),
    state: strOpt("Line 2 of rich presence."),
    startTime: numOpt("Unix Timestamp for beginning of activity."),
    endTime: numOpt("Unix Timestamp for end of activity."),
    imageBig: strOpt("Sets the big image to the specified image."),
    imageBigTooltip: strOpt("Sets the tooltip text for the big image."),
    imageSmall: strOpt("Sets the small image to the specified image."),
    imageSmallTooltip: strOpt("Sets the tooltip text for the small image."),
    buttonOneText: strOpt("The text for the first button"),
    buttonOneURL: strOpt("The URL for the first button"),
    buttonTwoText: strOpt("The text for the second button"),
    buttonTwoURL: strOpt("The URL for the second button")
});

async function setRpc() {
    const {
        appID,
        appName,
        buttonOneText,
        buttonOneURL,
        buttonTwoText,
        buttonTwoURL,
        details,
        endTime,
        imageBig,
        imageBigTooltip,
        imageSmall,
        imageSmallTooltip,
        startTime,
        state
    } = settings.store;

    if (!appName) return;

    const activity: Activity = {
        application_id: appID || "0",
        name: appName,
        state,
        details,
        type: 0,
        flags: 1 << 0,
    };

    if (startTime)
        activity.timestamps = {
            start: startTime,
            end: endTime
        };

    activity.buttons = [buttonOneText, buttonTwoText].filter(Boolean);

    activity.metadata = {
        button_urls: [buttonOneURL, buttonTwoURL].filter(Boolean)
    };

    if (imageBig)
        activity.assets = {
            large_image: await getApplicationAsset(imageBig),
            large_text: imageBigTooltip
        };

    if (imageSmall)
        activity.assets = {
            ...activity.assets,
            small_image: await getApplicationAsset(imageSmall),
            small_text: imageSmallTooltip,
        };


    for (const k in activity) {
        const v = activity[k];
        if (!v || v.length === 0)
            delete activity[k];
    }

    FluxDispatcher.dispatch({
        type: "LOCAL_ACTIVITY_UPDATE",
        activity
    });
}

export default definePlugin({
    name: "CustomRPC",
    description: "Allows you to set a custom rich presence.",
    authors: [Devs.captain],

    start: setRpc,

    settings,

    settingsAboutComponent: () => (
        <>
            <Forms.FormTitle tag="h2">NOTE:</Forms.FormTitle>
            <Forms.FormText>
                You will need to <Link href="https://discord.com/developers/applications">create an application</Link> and
                get its ID to use this plugin.
            </Forms.FormText>
        </>
    )
});