import { Postgres } from "@/database";

export async function seedCollectionItems(database: Postgres): Promise<void> {
    console.log("Starting collection items seeding...");

    try {
        // Get all experiences
        const experiences = await database.experiences.getAll();
        if (experiences.length === 0) {
            console.log("No experiences found. Please seed experiences first.");
            return;
        }

        // Get collections
        const featuredCollection = await database.experienceCollections.getCollectionBySlug("featured");
        const topPicksCollection = await database.experienceCollections.getCollectionBySlug("ohana-top-picks");
        const budgetCollection = await database.experienceCollections.getCollectionBySlug("budget-friendly");
        const luxuryCollection = await database.experienceCollections.getCollectionBySlug("luxury-experiences");

        if (!featuredCollection || !topPicksCollection) {
            console.log("Collections not found. Please seed collections first.");
            return;
        }

        // Add some experiences to featured (first 3)
        const featuredExperiences = experiences.slice(0, 3);
        for (const [index, exp] of featuredExperiences.entries()) {
            try {
                await database.experienceCollections.addExperienceToCollection(
                    featuredCollection.id,
                    exp.id,
                    index + 1
                );
                console.log(`✓ Added ${exp.title} to featured collection`);
            } catch (error) {
                console.log(`- ${exp.title} already in featured collection`);
            }
        }

        // Add some experiences to top picks (next 4)
        const topPickExperiences = experiences.slice(3, 7);
        for (const [index, exp] of topPickExperiences.entries()) {
            try {
                await database.experienceCollections.addExperienceToCollection(
                    topPicksCollection.id,
                    exp.id,
                    index + 1
                );
                console.log(`✓ Added ${exp.title} to top picks collection`);
            } catch (error) {
                console.log(`- ${exp.title} already in top picks collection`);
            }
        }

        // Add budget-friendly experiences (price < $50)
        if (budgetCollection) {
            const budgetExperiences = experiences.filter(exp => exp.pricePerPerson < 5000);
            for (const [index, exp] of budgetExperiences.entries()) {
                try {
                    await database.experienceCollections.addExperienceToCollection(
                        budgetCollection.id,
                        exp.id,
                        index + 1
                    );
                    console.log(`✓ Added ${exp.title} to budget-friendly collection`);
                } catch (error) {
                    console.log(`- ${exp.title} already in budget-friendly collection`);
                }
            }
        }

        // Add luxury experiences (price > $200)
        if (luxuryCollection) {
            const luxuryExperiences = experiences.filter(exp => exp.pricePerPerson > 20000);
            for (const [index, exp] of luxuryExperiences.entries()) {
                try {
                    await database.experienceCollections.addExperienceToCollection(
                        luxuryCollection.id,
                        exp.id,
                        index + 1
                    );
                    console.log(`✓ Added ${exp.title} to luxury collection`);
                } catch (error) {
                    console.log(`- ${exp.title} already in luxury collection`);
                }
            }
        }

        console.log("\nCollection items seeding completed!");
    } catch (error) {
        console.error("Error seeding collection items:", error);
    }
}