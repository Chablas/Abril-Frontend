import { ProjectSimpleDTO } from "../../../../../core/dtos/project/projectSimple.model";
import { CompanyFactoryDTO } from "./companyFactoryDTO.model";
import { ContractOriginSimpleDTO } from "./contractOriginSimple.model";
import { ContractSimpleDTO } from "./contractSimple.model";
import { ContractTypeSimpleDTO } from "./contractTypeSimple.model";
import { CurrencySimpleDTO } from "./currencySimple.model";
import { PaymentMethodSimpleDTO } from "./paymentMethodSimple.model";
import { WorkItemSimpleDTO } from "./workItemSimple.model";
import { WorkItemCategorySimpleDTO } from "./workItemCategorySimple.model";

export interface ProjectSubContractorFormDataDTO {
    projects: ProjectSimpleDTO[];
    contracts: ContractSimpleDTO[];
    contractTypes: ContractTypeSimpleDTO[];
    contractOrigins: ContractOriginSimpleDTO[];
    paymentMethods: PaymentMethodSimpleDTO[];
    currencies: CurrencySimpleDTO[];
    workItems: WorkItemSimpleDTO[];
    companies: CompanyFactoryDTO[];
    workItemCategories: WorkItemCategorySimpleDTO[];
}