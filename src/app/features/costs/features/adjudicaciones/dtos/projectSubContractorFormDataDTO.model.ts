import { ProjectSimpleDTO } from "../../../../../core/dtos/project/projectSimple.model";
import { ContributorFactoryDTO } from "./companyFactoryDTO.model";
import { ContractTypeSimpleDTO } from "./contractTypeSimple.model";
import { ContractModalitySimpleDTO } from "./contractModalitySimple.model";
import { CurrencySimpleDTO } from "./currencySimple.model";
import { PaymentMethodSimpleDTO } from "./paymentMethodSimple.model";
import { WorkItemSimpleDTO } from "./workItemSimple.model";
import { WorkItemCategorySimpleDTO } from "./workItemCategorySimple.model";

export interface ProjectSubContractorFormDataDTO {
    projects: ProjectSimpleDTO[];
    contractTypes: ContractTypeSimpleDTO[];
    contractModalities: ContractModalitySimpleDTO[];
    paymentMethods: PaymentMethodSimpleDTO[];
    currencies: CurrencySimpleDTO[];
    workItems: WorkItemSimpleDTO[];
    contributors: ContributorFactoryDTO[];
    workItemCategories: WorkItemCategorySimpleDTO[];
}