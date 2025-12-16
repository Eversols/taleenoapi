const { Skill } = require("../models");

module.exports = async (talentSkills = []) => {
  if (!Array.isArray(talentSkills) || !talentSkills.length) {
    return "Requested Service";
  }

  const skillIds = talentSkills
    .map(s => s.id)
    .filter(Boolean);

  if (!skillIds.length) return "Requested Service";

  const skills = await Skill.findAll({
    where: { id: skillIds },
    attributes: ["name"]
  });

  return skills.length
    ? skills.map(s => s.name).join(", ")
    : "Requested Service";
};
